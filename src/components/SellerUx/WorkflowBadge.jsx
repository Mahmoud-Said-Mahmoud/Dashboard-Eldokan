const styles = {
  draft: 'bg-slate-100 text-slate-700',
  pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-700',
}
const labels = {
  draft: ['Draft','مسودة'],
  pending: ['Pending Review','قيد المراجعة'],
  approved: ['Approved / Live','مقبول / مباشر'],
  rejected: ['Rejected','مرفوض'],
}
export default function WorkflowBadge({ state='draft', ar=false }) {
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${styles[state] || styles.draft}`}>
    {(labels[state] || labels.draft)[ar ? 1 : 0]}
  </span>
}
