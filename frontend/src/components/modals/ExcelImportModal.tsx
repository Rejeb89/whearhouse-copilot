import { useState } from 'react';
import { X, Upload } from 'lucide-react';
import client from '../../services/client';

interface ExcelImportModalProps {
  entityId: number;
  onClose: () => void;
  onImport: () => void;
}

export default function ExcelImportModal({ entityId, onClose, onImport }: ExcelImportModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<any[]>([]);
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setError('');

    try {
      // Use FileReader to read the file
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          // Import xlsx dynamically
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
          script.onload = () => {
            const workbook = (window as any).XLSX.read(event.target?.result, { type: 'array' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = (window as any).XLSX.utils.sheet_to_json(worksheet);

            // Validate and preview data
            const validatedData = jsonData.map((row: any) => ({
              rank: String(row['الرتبة'] || row['rank'] || '').trim(),
              name: String(row['الاسم'] || row['name'] || '').trim(),
              surname: String(row['اللقب'] || row['surname'] || '').trim(),
              number: String(row['الرقم'] || row['number'] || '').trim(),
              phone: String(row['الهاتف'] || row['phone'] || '').trim(),
            })).filter((row: any) => row.rank && row.name && row.surname && row.number);

            if (validatedData.length === 0) {
              setError('لم يتم العثور على بيانات صحيحة. تأكد من وجود الأعمدة: الرتبة، الاسم، اللقب، الرقم');
              return;
            }

            setPreview(validatedData);
          };
          document.head.appendChild(script);
        } catch (err) {
          setError('خطأ في قراءة الملف');
        }
      };
      reader.readAsArrayBuffer(uploadedFile);
    } catch (err) {
      setError('خطأ في معالجة الملف');
    }
  };

  const handleImport = async () => {
    if (preview.length === 0) {
      setError('لا توجد بيانات للاستيراد');
      return;
    }

    setLoading(true);
    try {
      await client.post(`/employees/${entityId}/bulk`, { employees: preview });
      onImport();
    } catch (err) {
      setError((err as any).response?.data?.error || 'خطأ في الاستيراد');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" dir="rtl">
      <div className="bg-card rounded-xl border border-border shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-border sticky top-0 bg-card">
          <h2 className="text-xl font-bold text-foreground">استيراد الموظفين من Excel</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded">
              {error}
            </div>
          )}

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              حدد ملف Excel
            </label>
            <label className="flex items-center justify-center w-full px-4 py-6 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50">
              <div className="flex flex-col items-center gap-2">
                <Upload className="w-6 h-6 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">اضغط لاختيار ملف أو اسحبه هنا</span>
                <span className="text-xs text-muted-foreground">xlsx, xls</span>
              </div>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>

          {/* Template Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-700 font-medium mb-2">تنسيق الملف المطلوب:</p>
            <ul className="text-sm text-blue-600 space-y-1">
              <li>• العمود الأول: الرتبة</li>
              <li>• العمود الثاني: الاسم</li>
              <li>• العمود الثالث: اللقب</li>
              <li>• العمود الرابع: الرقم</li>
              <li>• العمود الخامس: الهاتف (اختياري)</li>
            </ul>
          </div>

          {/* Preview */}
          {preview.length > 0 && (
            <div>
              <p className="text-sm font-medium text-foreground mb-2">
                معاينة البيانات ({preview.length} موظف)
              </p>
              <div className="overflow-x-auto border border-border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="px-4 py-2 text-right text-muted-foreground">الرتبة</th>
                      <th className="px-4 py-2 text-right text-muted-foreground">الاسم</th>
                      <th className="px-4 py-2 text-right text-muted-foreground">اللقب</th>
                      <th className="px-4 py-2 text-right text-muted-foreground">الرقم</th>
                      <th className="px-4 py-2 text-right text-muted-foreground">الهاتف</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 5).map((row, idx) => (
                      <tr key={idx} className="border-b border-border hover:bg-muted/50">
                        <td className="px-4 py-2">{row.rank}</td>
                        <td className="px-4 py-2">{row.name}</td>
                        <td className="px-4 py-2">{row.surname}</td>
                        <td className="px-4 py-2">{row.number}</td>
                        <td className="px-4 py-2">{row.phone || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {preview.length > 5 && (
                <p className="text-sm text-muted-foreground mt-2">... و {preview.length - 5} موظف آخر</p>
              )}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            {preview.length > 0 && (
              <button
                onClick={handleImport}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'جاري الاستيراد...' : `استيراد ${preview.length} موظف`}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-border text-foreground rounded-lg hover:bg-muted/50"
            >
              إلغاء
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
