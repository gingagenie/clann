import { useRef, useState } from 'react'
import { useShoppingList } from '@/hooks/useShoppingList'
import { cn } from '@/lib/utils'
import { Plus, Trash2, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function ShoppingPage() {
  const { items, addItem, toggleItem, deleteItem, clearChecked } = useShoppingList()
  const [name, setName] = useState('')
  const [adding, setAdding] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const unchecked = items.filter(i => !i.checked)
  const checked   = items.filter(i => i.checked)

  async function handleAdd() {
    const trimmed = name.trim()
    if (!trimmed) return
    setAdding(true)
    await addItem(trimmed)
    setName('')
    setAdding(false)
    inputRef.current?.focus()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Add item bar */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-3 py-3 max-w-lg mx-auto w-full">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            placeholder="Add an item…"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd() } }}
            className="flex-1"
          />
          <Button
            size="icon"
            onClick={handleAdd}
            disabled={adding || !name.trim()}
          >
            <Plus size={18} />
          </Button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto max-w-lg mx-auto w-full">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
            <ShoppingCart size={40} strokeWidth={1.25} />
            <p className="text-sm">Your list is empty</p>
          </div>
        ) : (
          <div className="px-3 pt-3 space-y-1">
            {/* Unchecked items */}
            {unchecked.map(item => (
              <ItemRow
                key={item.id}
                item={item}
                onToggle={() => toggleItem(item.id, true)}
                onDelete={() => deleteItem(item.id)}
              />
            ))}

            {/* Checked section */}
            {checked.length > 0 && (
              <>
                <div className="flex items-center justify-between pt-4 pb-1 px-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    In the basket ({checked.length})
                  </span>
                  <button
                    onClick={clearChecked}
                    className="text-xs text-destructive hover:underline font-medium"
                  >
                    Clear
                  </button>
                </div>
                {checked.map(item => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    onToggle={() => toggleItem(item.id, false)}
                    onDelete={() => deleteItem(item.id)}
                  />
                ))}
              </>
            )}

            <div className="h-4" />
          </div>
        )}
      </div>
    </div>
  )
}

// ── Item row ────────────────────────────────────────────────────

interface ItemRowProps {
  item: { id: string; name: string; quantity: string | null; checked: boolean }
  onToggle: () => void
  onDelete: () => void
}

function ItemRow({ item, onToggle, onDelete }: ItemRowProps) {
  return (
    <div className={cn(
      'flex items-center gap-3 rounded-2xl px-3 py-3 border transition-all',
      item.checked ? 'bg-muted/30 border-border/50' : 'bg-card border-border shadow-sm',
    )}>
      {/* Checkbox */}
      <button
        onClick={onToggle}
        className={cn(
          'w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
          item.checked
            ? 'bg-primary border-primary'
            : 'border-border hover:border-primary/60',
        )}
      >
        {item.checked && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* Name + quantity */}
      <div className="flex-1 min-w-0">
        <span className={cn(
          'text-sm font-medium',
          item.checked ? 'line-through text-muted-foreground' : 'text-foreground',
        )}>
          {item.name}
        </span>
        {item.quantity && (
          <span className="text-xs text-muted-foreground ml-1.5">{item.quantity}</span>
        )}
      </div>

      {/* Delete */}
      <button
        onClick={onDelete}
        className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors"
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}
