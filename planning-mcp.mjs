import { createInterface } from 'node:readline';
import { mkdir, open, readFile, readdir, rename, unlink, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { randomUUID } from 'node:crypto';

const directory = resolve(process.env.GANTT_PLANS_DIR || 'plans');
const DAY = 86400000;
const rowKinds = new Set(['task','review','delivery']);
const kinds = ['task','review','delivery','marker','off'];
const colors = ['#378ADD','#BA7517','#1D9E75','#D4537E','#7655B5'];
const date = value => {
  if (typeof value !== 'string' || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value)) throw Error('Date attendue au format AAAA-MM-JJ.');
  const time = Date.parse(value);
  if (!Number.isFinite(time) || new Date(time).toISOString().slice(0,10)!==value) throw Error('Date invalide.');
  return time/DAY;
};
const iso = value => new Date(value*DAY).toISOString().slice(0,10);
function text(value,label,limit=80) {
  if (typeof value!=='string' || !value.trim() || value.length>limit) throw Error(label+' invalide.');
  return value.trim();
}
function file(id) {
  if (typeof id!=='string' || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(id)) throw Error('Identifiant de fichier invalide.');
  return join(directory,id+'.json');
}
function nameToId(name) {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,56)||'planning';
}
function find(entries,id,label) {
  const value = entries.find(entry=>entry.id===id);
  if (!value) throw Error(label+' introuvable : '+id);
  return value;
}
function validate(plan) {
  text(plan.title,'Titre');
  if (!Array.isArray(plan.lots) || !Array.isArray(plan.items)) throw Error('Format du planning invalide.');
  if (plan.startDate) date(plan.startDate);
  if (plan.endDate) date(plan.endDate);
  if (plan.startDate && plan.endDate && plan.endDate<plan.startDate) throw Error('La fin estimée précède le début.');
  const rows = new Map();
  for (const lot of plan.lots) {
    text(lot.name,'Nom du groupe');
    if (!/^#[0-9a-f]{6}$/i.test(lot.color) || !Array.isArray(lot.rows)) throw Error('Groupe invalide.');
    for (const row of lot.rows) {
      text(row.name,'Nom de ligne');
      rows.set(row.id,lot.id);
    }
  }
  for (const item of plan.items) {
    if (![...kinds,'allocation'].includes(item.kind) || date(item.end)<date(item.start)) throw Error('Élément invalide : '+item.id);
    if (rowKinds.has(item.kind) && (!rows.has(item.row) || rows.get(item.row)!==item.lot)) throw Error('Ligne invalide : '+item.id);
    if (item.bufferDays!==undefined && (!Number.isSafeInteger(item.bufferDays)||item.bufferDays<0)) throw Error('Tampon invalide : '+item.id);
  }
  return plan;
}
const restrictionKey = item => item.restriction?.trim().normalize('NFC').toLocaleLowerCase('fr');
function avoidConflict(plan,item) {
  const key = restrictionKey(item);
  if (!key) return;
  const occupied = plan.items.filter(candidate=>candidate.id!==item.id && restrictionKey(candidate)===key)
    .map(candidate=>[date(candidate.start),date(candidate.end)]).sort((a,b)=>a[0]-b[0]);
  const holidays = plan.items.filter(candidate=>candidate.kind==='off').map(candidate=>[date(candidate.start),date(candidate.end)]);
  let from = date(item.start);
  const duration = date(item.end)-from;
  const limit = date('9999-12-31');
  for (const [start,end] of occupied) {
    if (from+duration<start) break;
    if (from>end) continue;
    from = end+1;
    while (from<=limit) {
      const blocked = holidays.reduce((last,[start,end])=>start<=from&&from<=end?Math.max(last,end):last,-Infinity);
      if (blocked>=from) { from=blocked+1; continue; }
      const weekday = new Date(from*DAY).getUTCDay();
      if (weekday!==0 && weekday!==6) break;
      from++;
    }
  }
  if (from+duration>limit) throw Error('Aucun créneau disponible pour cet identifiant.');
  item.start=iso(from);
  item.end=iso(from+duration);
}
async function read(id) {
  return validate(JSON.parse(await readFile(file(id),'utf8')));
}
async function save(id,plan) {
  validate(plan);
  const path = file(id);
  const temp = path+'.'+randomUUID()+'.tmp';
  try {
    await writeFile(temp,JSON.stringify(plan,null,2)+'\n',{flag:'wx',mode:0o600});
    await rename(temp,path);
  } finally { await unlink(temp).catch(()=>{}); }
}
async function locked(action) {
  await mkdir(directory,{recursive:true});
  const path = join(directory,'.gantt.lock');
  const lock = await open(path,'wx').catch(error=>{
    if (error.code==='EEXIST') throw Error('Un autre enregistrement est en cours.');
    throw error;
  });
  try { return await action(); }
  finally { await lock.close(); await unlink(path); }
}
const string = {type:'string'};
const day = {type:'string',description:'Date au format AAAA-MM-JJ'};
const schema = (properties,required=[])=>({type:'object',properties,required,additionalProperties:false});
const options = {
  nom:string,debut:day,fin:day,ligne:string,
  tampon:{type:'integer',minimum:0,description:'Nombre de jours ouvrés de tampon'},
  identifiant:{type:'string',description:'Identifiant de restriction. Une chaîne vide retire la restriction.'}
};
const id = {id:string};
const tools = [
  {name:'lister_plannings',description:'Lister les fichiers du dossier plans.',inputSchema:schema({}),annotations:{readOnlyHint:true}},
  {name:'lire_planning',description:'Lire les dates, lignes et éléments d’un planning, y compris leurs identifiants.',inputSchema:schema(id,['id']),annotations:{readOnlyHint:true}},
  {name:'creer_planning',description:'Créer un planning JSON avec une première ligne. Le fichier est compatible avec Load/Save du Gantt.',inputSchema:schema({titre:string,debut:day,fin:day,premiere_ligne:string},['titre','debut'])},
  {name:'ajouter_ligne',description:'Ajouter une ligne principale. Indiquer le groupe parent pour ajouter une sous-ligne.',inputSchema:schema({...id,nom:string,parent:string},['id','nom'])},
  {name:'ajouter_element',description:'Ajouter une tâche, livraison, jalon global, délai de retour ou période chômée. Une ligne est requise pour task, review et delivery.',inputSchema:schema({...id,...options,type:{type:'string',enum:kinds}},['id','type','debut'])},
  {name:'modifier_element',description:'Modifier un élément existant. Indiquer uniquement ce qui change. Un début seul décale la tâche en conservant sa durée. En cas de conflit d’identifiant, la tâche est reportée.',inputSchema:schema({...id,...options,element:string},['id','element'])}
];
function applyFields(plan,item,args) {
  if (args.ligne!==undefined) {
    if (!rowKinds.has(item.kind)) throw Error('Cet élément ne dépend pas d’une ligne.');
    const lot=plan.lots.find(lot=>lot.rows.some(row=>row.id===args.ligne));
    if (!lot) throw Error('Ligne introuvable : '+args.ligne);
    item.lot=lot.id;
    item.row=args.ligne;
  }
  if (args.nom!==undefined) {
    if (args.nom==='') delete item.name;
    else item.name=text(args.nom,'Nom');
  }
  if (args.tampon!==undefined) item.bufferDays=args.tampon;
  if (args.identifiant!==undefined) {
    if (item.kind==='off') throw Error('Une période chômée ne peut pas être affectée à un identifiant.');
    if (args.identifiant==='') delete item.restriction;
    else item.restriction=text(args.identifiant,'Identifiant');
  }
  if (item.kind==='review' || item.kind==='delivery') item.start=item.end;
  if (date(item.end)<date(item.start)) throw Error('La fin précède le début.');
  avoidConflict(plan,item);
}
async function run(name,args={}) {
  if (name==='lister_plannings') return (await readdir(directory).catch(error=>{
    if (error.code==='ENOENT') return [];
    throw error;
  })).filter(name=>/^[a-z0-9][a-z0-9-]{0,63}\.json$/.test(name)).map(name=>name.slice(0,-5)).sort();
  if (name==='lire_planning') return {id:args.id,planning:await read(args.id)};
  return locked(async ()=>{
    if (name==='creer_planning') {
      const title=text(args.titre,'Titre');
      date(args.debut);
      if (args.fin!==undefined) date(args.fin);
      const uid=nameToId(title)+'-'+randomUUID().slice(0,6);
      const row={id:randomUUID(),name:args.premiere_ligne?text(args.premiere_ligne,'Nom de ligne'):'Nouvelle ligne'};
      const plan={title,startDate:args.debut,lots:[{id:randomUUID(),inline:true,name:row.name,color:colors[0],rows:[row]}],items:[]};
      if (args.fin) plan.endDate=args.fin;
      await save(uid,plan);
      return {id:uid,fichier:'plans/'+uid+'.json',planning:plan};
    }
    const plan=await read(args.id);
    let result;
    if (name==='ajouter_ligne') {
      const row={id:randomUUID(),name:text(args.nom,'Nom de ligne')};
      if (args.parent) find(plan.lots,args.parent,'Groupe').rows.push(row);
      else plan.lots.push({id:randomUUID(),inline:true,name:row.name,color:colors[plan.lots.length%colors.length],rows:[row]});
      result=row;
    } else if (name==='ajouter_element') {
      if (!kinds.includes(args.type)) throw Error('Type d’élément invalide.');
      const item={id:randomUUID(),kind:args.type,start:args.debut,end:args.fin||args.debut};
      applyFields(plan,item,args);
      plan.items.push(item);
      result=item;
    } else if (name==='modifier_element') {
      const item=find(plan.items,args.element,'Élément');
      const span=date(item.end)-date(item.start);
      if (args.debut!==undefined) {
        const start=date(args.debut);
        item.start=args.debut;
        if (args.fin===undefined) item.end=iso(start+span);
      }
      if (args.fin!==undefined) item.end=args.fin;
      applyFields(plan,item,args);
      result=item;
    } else throw Error('Outil inconnu.');
    await save(args.id,plan);
    return {id:args.id,fichier:'plans/'+args.id+'.json',element:result};
  });
}
const protocolVersions = ['2025-11-25','2025-06-18','2025-03-26','2024-11-05'];
async function dispatch(message) {
  const {id,method,params}=message;
  if (id===undefined) return;
  const reply=result=>({jsonrpc:'2.0',id,result});
  if (method==='initialize') return reply({
    protocolVersion:protocolVersions.includes(params?.protocolVersion)?params.protocolVersion:protocolVersions[0],
    serverInfo:{name:'ganttmesc',version:'1.0.0'},capabilities:{tools:{}}
  });
  if (method==='ping') return reply({});
  if (method==='tools/list') return reply({tools});
  if (method!=='tools/call') return {jsonrpc:'2.0',id,error:{code:-32601,message:'Méthode inconnue'}};
  try {
    const result = await run(params?.name,params?.arguments);
    return reply({content:[{type:'text',text:JSON.stringify(result)}]});
  } catch (error) {
    return reply({isError:true,content:[{type:'text',text:error.message}]});
  }
}
if (process.argv[2]==='--list') {
  process.stdout.write(JSON.stringify(tools,null,2)+'\n');
} else if (process.argv[2]==='--call') {
  try {
    const result=await run(process.argv[3],JSON.parse(process.argv[4]||'{}'));
    process.stdout.write(JSON.stringify(result,null,2)+'\n');
  } catch (error) {
    process.stderr.write(error.message+'\n');
    process.exitCode=1;
  }
} else {
  for await (const message of createInterface({input:process.stdin,crlfDelay:Infinity})) {
    try {
      const reply=await dispatch(JSON.parse(message));
      if (reply) process.stdout.write(JSON.stringify(reply)+'\n');
    } catch {
      process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:null,error:{code:-32700,message:'Requête JSON invalide'}})+'\n');
    }
  }
}
