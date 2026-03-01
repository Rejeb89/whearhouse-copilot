import React, { useState, useEffect } from 'react'
import client from '../../services/client'
import { X, ChevronDown } from 'lucide-react'

interface DistributeItemModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface Item {
  id: number
  name: string
  sku: string
  quantity: number
}

interface SelectedItem {
  id: number
  name: string
  sku: string
  quantity: number
}

interface Entity {
  id: number
  name: string
  type: 'SUPPLIER' | 'BENEFICIARY'
  phone: string
}

export default function DistributeItemModal({ isOpen, onClose, onSuccess }: DistributeItemModalProps) {
  const [items, setItems] = useState<Item[]>([])
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [beneficiaries, setBeneficiaries] = useState<Entity[]>([])
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<Entity | null>(null)
  const [newBeneficiaryName, setNewBeneficiaryName] = useState('')
  const [showBeneficiaryDropdown, setShowBeneficiaryDropdown] = useState(false)
  const [reference, setReference] = useState(`DIST-${Date.now()}`)
  const [itemQuantities, setItemQuantities] = useState<{ [key: number]: number }>({})
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchItems()
      fetchBeneficiaries()
    }
  }, [isOpen])

  const fetchItems = async () => {
    try {
      const res = await client.get('/items')
      setItems(res.data.data.filter((item: Item) => item.quantity > 0))
    } catch (err) {
      setError('خطأ في تحميل التجهيزات')
    }
  }

  const fetchBeneficiaries = async () => {
    try {
      const res = await client.get('/entities?type=BENEFICIARY')
      setBeneficiaries(res.data.data)
    } catch (err) {
      setError('خطأ في تحميل الجهات')
    }
  }

  const filteredItems = items.filter(item => 
    !selectedItems.find(s => s.id === item.id) &&
    (item.name.includes(searchTerm) || item.sku.includes(searchTerm))
  )

  const filteredBeneficiaries = beneficiaries.filter(b =>
    b.name.toLowerCase().includes(newBeneficiaryName.toLowerCase())
  )

  const handleSelectItem = (item: Item) => {
    setSelectedItems([...selectedItems, item])
    setItemQuantities({ ...itemQuantities, [item.id]: 1 })
    setSearchTerm('')
    setShowDropdown(false)
  }

  const handleRemoveItem = (itemId: number) => {
    setSelectedItems(selectedItems.filter(item => item.id !== itemId))
    const newQuantities = { ...itemQuantities }
    delete newQuantities[itemId]
    setItemQuantities(newQuantities)
  }

  const handleQuantityChange = (itemId: number, quantity: number) => {
    if (quantity > 0) {
      setItemQuantities({ ...itemQuantities, [itemId]: quantity })
    }
  }

  const handleSelectBeneficiary = (beneficiary: Entity) => {
    setSelectedBeneficiary(beneficiary)
    setNewBeneficiaryName('')
    setShowBeneficiaryDropdown(false)
  }

  const handleAddNewBeneficiary = async () => {
    if (!newBeneficiaryName.trim()) {
      setError('يجب إدخال اسم الجهة المنتفعة')
      return
    }

    try {
      const res = await client.post('/entities', {
        name: newBeneficiaryName,
        type: 'BENEFICIARY',
        category: 'الوحدات المتنفعة',
        phone: '',
      })
      const newBeneficiary = res.data.data
      setBeneficiaries([...beneficiaries, newBeneficiary])
      setSelectedBeneficiary(newBeneficiary)
      setNewBeneficiaryName('')
      setShowBeneficiaryDropdown(false)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'خطأ في إضافة الجهة')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (selectedItems.length === 0) {
      setError('يجب اختيار تجهيز واحد على الأقل')
      return
    }

    if (!selectedBeneficiary) {
      setError('يجب تحديد الجهة المنتفعة')
      return
    }

    setLoading(true)

    try {
      const distributionItems = selectedItems.map(item => ({
        itemId: item.id,
        quantity: itemQuantities[item.id] || 1
      }))

      await client.post('/distributions', {
        reference: `${reference}-${selectedBeneficiary.name}`,
        beneficiaryId: selectedBeneficiary.id,
        items: distributionItems
      })

      setSelectedItems([])
      setSelectedBeneficiary(null)
      setItemQuantities({})
      setReference(`DIST-${Date.now()}`)
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err?.response?.data?.error || 'حدث خطأ')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" dir="rtl">
      <div className="bg-card p-6 rounded-xl border border-border shadow-lg max-w-md w-full max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-foreground">تسليم التجهيزات</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* الجهة المنتفعة */}
          <div>
            <label className="block text-sm mb-2">الجهة المنتفعة</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowBeneficiaryDropdown(!showBeneficiaryDropdown)}
                className="w-full border border-input p-2 rounded bg-background text-foreground flex justify-between items-center"
              >
                <span className="text-foreground">
                  {selectedBeneficiary ? selectedBeneficiary.name : 'اختر أو أضف جهة'}
                </span>
                <ChevronDown className="w-4 h-4" />
              </button>

              {showBeneficiaryDropdown && (
                <div className="absolute top-full left-0 right-0 border border-t-0 bg-card border-border rounded-b z-10">
                  <div className="max-h-40 overflow-y-auto">
                    {/* الجهات الموجودة */}
                    {filteredBeneficiaries.length > 0 && (
                      <>
                        {filteredBeneficiaries.map(beneficiary => (
                          <button
                            key={beneficiary.id}
                            type="button"
                            onClick={() => handleSelectBeneficiary(beneficiary)}
                            className="w-full text-right p-2 hover:bg-blue-50 border-b text-sm"
                          >
                            {beneficiary.name}
                          </button>
                        ))}
                      </>
                    )}
                    
                    {/* خيار إضافة جهة جديدة */}
                    {newBeneficiaryName.trim() && filteredBeneficiaries.length === 0 && (
                      <button
                        type="button"
                        onClick={handleAddNewBeneficiary}
                        className="w-full text-right p-2 hover:bg-green-50 border-b text-sm text-green-600 font-semibold"
                      >
                        + إضافة جهة جديدة: {newBeneficiaryName}
                      </button>
                    )}

                    {filteredBeneficiaries.length === 0 && !newBeneficiaryName.trim() && (
                      <div className="p-2 text-sm text-muted-foreground">ابدأ الكتابة لإضافة جهة جديدة</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* اختيار التجهيزات */}
          <div>
            <label className="block text-sm mb-2">اختر التجهيزات</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowDropdown(!showDropdown)}
                className="w-full border border-input p-2 rounded bg-background text-foreground flex justify-between items-center"
              >
                <span className="text-foreground">
                  {selectedItems.length > 0 
                    ? `تم اختيار ${selectedItems.length} تجهيز` 
                    : 'ابحث واختر التجهيزات'}
                </span>
                <ChevronDown className="w-4 h-4" />
              </button>

              {showDropdown && (
                <div className="absolute top-full left-0 right-0 border border-t-0 bg-card border-border rounded-b z-10">
                  <input
                    type="text"
                    placeholder="ابحث عن تجهيز..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full border-b border-border bg-background p-2 text-sm"
                    autoFocus
                  />
                  <div className="max-h-40 overflow-y-auto">
                    {filteredItems.length > 0 ? (
                      filteredItems.map(item => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelectItem(item)}
                          className="w-full text-right p-2 hover:bg-blue-50 border-b text-sm flex justify-between"
                        >
                          <span>{item.name} ({item.sku})</span>
                          <span className="text-muted-foreground">المتاح: {item.quantity}</span>
                        </button>
                      ))
                    ) : (
                      <div className="p-2 text-sm text-muted-foreground">لا توجد تجهيزات متطابقة</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {selectedItems.length > 0 && (
            <div className="border-t pt-3">
              <label className="block text-sm mb-2 font-semibold">التجهيزات المختارة:</label>
              <div className="space-y-2">
                {selectedItems.map(item => (
                  <div key={item.id} className="flex items-center gap-2 p-2 bg-blue-50 rounded">
                    <div className="flex-grow">
                      <div className="text-sm font-semibold">{item.name}</div>
                      <div className="text-xs text-muted-foreground">{item.sku}</div>
                    </div>
                    <input
                      type="number"
                      min="1"
                      max={item.quantity}
                      value={itemQuantities[item.id] || 1}
                      onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 1)}
                      className="border p-1 rounded w-16 text-xs text-center"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="text-red-600 hover:text-red-700 text-sm font-bold"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-border rounded hover:bg-muted/50"
              disabled={loading}
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              disabled={loading}
            >
              {loading ? 'جاري التسليم...' : 'تسليم'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
