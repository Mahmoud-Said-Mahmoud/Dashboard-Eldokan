import { useMemo, useState } from 'react'
import { buildCategoryTree, findCategoryPath, flattenCategoryTree } from '../../lib/categoryUtils'

function Column({ title, items, selectedId, onSelect, ar }) {
  return <div className="min-w-0 flex-1 border-e border-slate-200 last:border-e-0">
    <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700">{title}</div>
    <div className="max-h-72 overflow-y-auto p-2">
      {items.length ? items.map(item => <button key={item.id} type="button" onClick={()=>onSelect(item)} className={`mb-1 flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-start text-sm ${Number(selectedId)===Number(item.id)?'bg-slate-100 font-black text-black':'text-slate-700 hover:bg-slate-50'}`}><span className="truncate">{item.name}</span>{!!item.children?.length && <span className="text-slate-400">{ar?'‹':'›'}</span>}</button>) : <div className="p-4 text-center text-sm text-slate-400">{ar?'لا توجد تصنيفات':'No categories'}</div>}
    </div>
  </div>
}

export default function CategorySelector({ categories, value, onChange, ar }) {
  const [open,setOpen]=useState(false), [search,setSearch]=useState(''), [l1,setL1]=useState(null), [l2,setL2]=useState(null)
  const tree=useMemo(()=>buildCategoryTree(categories||[]),[categories])
  const flat=useMemo(()=>flattenCategoryTree(tree),[tree])
  const path=useMemo(()=>findCategoryPath(tree,value)||[],[tree,value])
  const filtered=useMemo(()=>{const q=search.trim().toLowerCase();return q?flat.filter(i=>i.pathLabel.toLowerCase().includes(q)):[]},[flat,search])
  const label=path.length?path.map(i=>i.name).join(' > '):''
  function choose(item,level){if(level===1){setL1(item);setL2(null);if(!item.children?.length){onChange(item.id);setOpen(false)}}else if(level===2){setL2(item);if(!item.children?.length){onChange(item.id);setOpen(false)}}else{onChange(item.id);setOpen(false)}}
  return <div className="relative">
    <button type="button" onClick={()=>setOpen(v=>!v)} className="flex w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-4 py-4 text-start hover:border-black"><span className={label?'text-slate-900':'text-slate-400'}>{label||(ar?'اختر التصنيف':'Select Category')}</span><span>{ar?'‹':'›'}</span></button>
    {open && <div className="absolute inset-x-0 top-[calc(100%+8px)] z-30 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
      <div className="border-b border-slate-200 p-4"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder={ar?'ابحث عن التصنيف...':'Search category...'} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-black"/></div>
      {search ? <div className="max-h-80 overflow-y-auto p-2">{filtered.length?filtered.map(item=><button type="button" key={item.id} onClick={()=>{onChange(item.id);setSearch('');setOpen(false);setL1(item.path?.[0]||null);setL2(item.path?.[1]||null)}} className="block w-full rounded-xl px-4 py-3 text-start text-sm text-slate-700 hover:bg-slate-100 hover:text-black">{item.pathLabel}</button>):<div className="p-8 text-center text-sm text-slate-400">{ar?'لا توجد نتائج':'No results'}</div>}</div> : <div className="flex overflow-x-auto"><Column title={ar?'التصنيف الرئيسي':'Main Category'} items={tree} selectedId={l1?.id} onSelect={i=>choose(i,1)} ar={ar}/><Column title={ar?'التصنيف الفرعي':'Sub Category'} items={l1?.children||[]} selectedId={l2?.id} onSelect={i=>choose(i,2)} ar={ar}/><Column title={ar?'التصنيف النهائي':'Child Category'} items={l2?.children||[]} selectedId={value} onSelect={i=>choose(i,3)} ar={ar}/></div>}
    </div>}
  </div>
}
