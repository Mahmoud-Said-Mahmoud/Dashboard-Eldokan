import { useState } from 'react'
import {
  previewProductImport,
  importProductsFromExcel,
} from '../../lib/productApi'

export default function ExcelProductImport({
  ar,
  onViewProducts,
}) {
  const [excelFile, setExcelFile] = useState(null)
  const [imagesZip, setImagesZip] = useState(null)
  const [preview, setPreview] = useState(null)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [previewing, setPreviewing] = useState(false)
  const [importing, setImporting] = useState(false)

  async function handlePreview() {
    if (!excelFile || !imagesZip) return

    setPreviewing(true)
    setError('')
    setResult(null)

    try {
      const data = await previewProductImport(excelFile, imagesZip)
      setPreview(data)
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : ar
          ? 'تعذر مراجعة ملف المنتجات'
          : 'Could not preview products'
      )
    } finally {
      setPreviewing(false)
    }
  }

  async function handleImport() {
    if (!excelFile || !imagesZip || !preview?.summary?.valid) return

    setImporting(true)
    setError('')

    try {
      const data = await importProductsFromExcel(excelFile, imagesZip)
      setResult(data)
      setPreview(null)
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : ar
          ? 'تعذر استيراد المنتجات'
          : 'Could not import products'
      )
    } finally {
      setImporting(false)
    }
  }

  return (
    <div>
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <h2 className="text-xl font-black text-black">
          {ar ? 'رفع المنتجات من Excel' : 'Import Products from Excel'}
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          {ar
            ? 'حمّل القالب، املأ بيانات المنتجات، ثم ارفع ملف Excel وملف ZIP الذي يحتوي على الصور.'
            : 'Download the template, fill in your products, then upload the Excel file and the ZIP containing the images.'}
        </p>

        <a
          href="/ElDokan-Product-Import-Template.xlsx"
          download
          className="mt-4 inline-flex rounded-xl border border-black bg-white px-5 py-3 text-sm font-black text-black transition hover:bg-slate-100"
        >
          {ar ? 'تحميل Excel Template' : 'Download Excel Template'}
        </a>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-black text-black">
            {ar ? 'ملف المنتجات Excel' : 'Products Excel File'}
          </label>

          <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-black bg-white p-5 text-center transition hover:bg-slate-50">
            <span className="text-3xl">+</span>
            <span className="mt-2 text-sm font-black text-black">
              {excelFile
                ? excelFile.name
                : ar
                ? 'اضغط لرفع ملف .xlsx'
                : 'Click to upload .xlsx'}
            </span>

            <input
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(event) => {
                setExcelFile(event.target.files?.[0] || null)
                setPreview(null)
                setResult(null)
              }}
            />
          </label>
        </div>

        <div>
          <label className="mb-2 block text-sm font-black text-black">
            {ar ? 'صور المنتجات ZIP' : 'Product Images ZIP'}
          </label>

          <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-black bg-white p-5 text-center transition hover:bg-slate-50">
            <span className="text-3xl">+</span>
            <span className="mt-2 text-sm font-black text-black">
              {imagesZip
                ? imagesZip.name
                : ar
                ? 'اضغط لرفع images.zip'
                : 'Click to upload images.zip'}
            </span>

            <input
              type="file"
              accept=".zip,application/zip"
              className="hidden"
              onChange={(event) => {
                setImagesZip(event.target.files?.[0] || null)
                setPreview(null)
                setResult(null)
              }}
            />
          </label>
        </div>
      </div>

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          disabled={!excelFile || !imagesZip || previewing}
          onClick={handlePreview}
          className="rounded-xl bg-black px-7 py-3.5 font-black text-white transition disabled:cursor-not-allowed disabled:opacity-40"
        >
          {previewing
            ? ar
              ? 'جاري المراجعة...'
              : 'Checking...'
            : ar
            ? 'مراجعة المنتجات'
            : 'Preview Products'}
        </button>
      </div>

      {error && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {preview && (
        <div className="mt-8">
          <div className="mb-5 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 p-5">
              <div className="text-sm text-slate-500">
                {ar ? 'الإجمالي' : 'Total'}
              </div>
              <div className="mt-1 text-3xl font-black text-black">
                {preview.summary?.total || 0}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-5">
              <div className="text-sm text-slate-500">
                {ar ? 'جاهز' : 'Ready'}
              </div>
              <div className="mt-1 text-3xl font-black text-black">
                {preview.summary?.valid || 0}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-5">
              <div className="text-sm text-slate-500">
                {ar ? 'أخطاء' : 'Errors'}
              </div>
              <div className="mt-1 text-3xl font-black text-black">
                {preview.summary?.errors || 0}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-start text-sm font-black">#</th>
                  <th className="px-4 py-3 text-start text-sm font-black">
                    {ar ? 'المنتج' : 'Product'}
                  </th>
                  <th className="px-4 py-3 text-start text-sm font-black">SKU</th>
                  <th className="px-4 py-3 text-start text-sm font-black">
                    {ar ? 'التصنيف' : 'Category'}
                  </th>
                  <th className="px-4 py-3 text-start text-sm font-black">
                    {ar ? 'الحالة' : 'Status'}
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {(preview.rows || []).map((row) => (
                  <tr key={row.row}>
                    <td className="px-4 py-4 text-slate-500">{row.row}</td>
                    <td className="px-4 py-4 font-bold text-black">
                      {row.name || '—'}
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      {row.sku || '—'}
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      {[row.mainCategory, row.subCategory]
                        .filter(Boolean)
                        .join(' > ') || '—'}
                    </td>
                    <td className="px-4 py-4">
                      {row.valid ? (
                        <span className="font-bold text-emerald-700">
                          {ar ? 'جاهز' : 'Ready'}
                        </span>
                      ) : (
                        <div>
                          <div className="font-bold text-red-700">
                            {ar ? 'خطأ' : 'Error'}
                          </div>
                          <div className="mt-1 max-w-md text-xs leading-5 text-red-600">
                            {(row.errors || []).join(' • ')}
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              disabled={importing || !preview.summary?.valid}
              onClick={handleImport}
              className="rounded-xl bg-black px-7 py-4 font-black text-white disabled:opacity-40"
            >
              {importing
                ? ar
                  ? 'جاري الاستيراد...'
                  : 'Importing...'
                : ar
                ? `استيراد ${preview.summary?.valid || 0} منتج`
                : `Import ${preview.summary?.valid || 0} Products`}
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-6">
          <h2 className="text-xl font-black text-black">
            {ar ? 'تم الاستيراد' : 'Import Complete'}
          </h2>

          <p className="mt-3 text-sm text-slate-600">
            {ar ? 'تم إنشاء' : 'Created'}:{' '}
            <strong>{result.summary?.created || 0}</strong>
            {' · '}
            {ar ? 'تم التخطي' : 'Skipped'}:{' '}
            <strong>{result.summary?.skipped || 0}</strong>
          </p>

          {onViewProducts && (
            <button
              type="button"
              onClick={onViewProducts}
              className="mt-5 rounded-xl bg-black px-6 py-3 font-bold text-white"
            >
              {ar ? 'عرض المنتجات' : 'View Products'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
