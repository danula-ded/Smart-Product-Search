import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { NavLink } from 'react-router-dom'

import {
  Sidebar as AppSidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { cn } from '@/shared/lib/utils'

import { sidebarItems } from '../model/sidebarItems'

function SidebarCollapseButton() {
  const { state, toggleSidebar } = useSidebar()
  const collapsed = state === 'collapsed'

  return (
    <button
      type="button"
      onClick={toggleSidebar}
      className={cn(
        'flex h-9 items-center justify-center rounded-md border border-[var(--semantic-border-default)] bg-[var(--semantic-background-elevated)] text-[var(--semantic-text-secondary)] transition-colors hover:bg-[var(--semantic-control-hover)] hover:text-[var(--semantic-text-primary)]',
        collapsed ? 'w-full' : 'ml-auto w-9',
      )}
      aria-label={collapsed ? 'Открыть боковую панель' : 'Свернуть боковую панель'}
    >
      {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
    </button>
  )
}

export function Sidebar() {
  return (
    <AppSidebar
      collapsible="icon"
      className="border-r border-[var(--semantic-border-default)] bg-[var(--semantic-background-elevated)] text-[var(--semantic-text-primary)] [&_[data-slot=sidebar-inner]]:bg-[var(--semantic-background-elevated)] [&_[data-slot=sidebar-inner]]:text-[var(--semantic-text-primary)]"
    >
      <SidebarHeader className="gap-0 p-0">
        <div className="border-b border-[var(--semantic-border-default)] px-4 py-4 group-data-[collapsible=icon]:px-0">
          <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-[var(--semantic-border-default)] bg-[var(--semantic-background-info)] text-sm font-semibold text-[var(--semantic-text-primary)]">
              SP
            </div>
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <div className="truncate text-sm font-semibold text-[var(--semantic-text-primary)]">
                Smart Product Search
              </div>
              <div className="text-xs text-[var(--semantic-text-muted)]">
                Каталог и аналитика продукции
              </div>
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-0 py-4">
        <SidebarMenu className="gap-0">
          {sidebarItems.map((item) => (
            <SidebarMenuItem key={item.path}>
              <NavLink
                to={item.path}
                end={item.path === '/'}
                title={item.label}
                className={({ isActive }) =>
                  cn(
                    'flex w-full items-start border-y border-x-0 px-4 py-3 text-left transition-colors outline-none group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0',
                    isActive
                      ? 'border-[var(--semantic-border-default)] bg-[var(--semantic-background-info)] text-[var(--semantic-text-primary)]'
                      : 'border-transparent text-[var(--semantic-text-secondary)] hover:border-[var(--semantic-border-default)] hover:bg-[var(--semantic-control-hover)] hover:text-[var(--semantic-text-primary)] focus-visible:border-[var(--semantic-border-default)] focus-visible:bg-[var(--semantic-control-hover)]',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      className={cn(
                        'mt-0.5 size-5 shrink-0',
                        isActive
                          ? 'text-[var(--semantic-icon-primary)]'
                          : 'text-[var(--semantic-text-secondary)]',
                      )}
                    />
                    <span className="min-w-0 group-data-[collapsible=icon]:hidden">
                      <span
                        className={cn(
                          'block text-sm font-semibold',
                          isActive
                            ? 'text-[var(--semantic-text-primary)]'
                            : 'text-[var(--semantic-text-secondary)]',
                        )}
                      >
                        {item.label}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-[var(--semantic-text-muted)]">
                        {item.sidebarDescription}
                      </span>
                    </span>
                  </>
                )}
              </NavLink>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="mt-auto gap-0 p-0">
        <div className="border-t border-[var(--semantic-border-default)] px-4 py-4 group-data-[collapsible=icon]:px-3">
          <SidebarCollapseButton />
        </div>
      </SidebarFooter>
    </AppSidebar>
  )
}
