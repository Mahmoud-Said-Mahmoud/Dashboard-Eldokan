export function buildCategoryTree(categories = []) {
  const map = new Map(); const roots = []
  categories.forEach(c => map.set(c.id,{...c,children:[]}))
  map.forEach(c => { const p=Number(c.parent||0); if(p && map.has(p)) map.get(p).children.push(c); else roots.push(c) })
  const sort=(a,b)=>String(a.name||'').localeCompare(String(b.name||''))
  const rec=items=>{items.sort(sort);items.forEach(i=>rec(i.children))}; rec(roots); return roots
}
export function findCategoryPath(tree,id,path=[]){for(const c of tree){const n=[...path,c];if(Number(c.id)===Number(id))return n;const f=findCategoryPath(c.children||[],id,n);if(f)return f}return null}
export function flattenCategoryTree(tree,path=[],result=[]){tree.forEach(c=>{const n=[...path,c];result.push({...c,path:n,pathLabel:n.map(x=>x.name).join(' > ')});flattenCategoryTree(c.children||[],n,result)});return result}
