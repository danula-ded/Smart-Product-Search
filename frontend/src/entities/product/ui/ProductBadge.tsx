import type { ProductAttribute } from '@/entities/product/model/types'
import { AppBadge } from '@/shared/ui'

type ProductBadgeProps = {
  attribute: ProductAttribute
}

export function ProductBadge({ attribute }: ProductBadgeProps) {
  return (
    <AppBadge tone="subtle" className="max-w-full">
      <span className="truncate">
        {attribute.name}: {attribute.value}
      </span>
    </AppBadge>
  )
}
