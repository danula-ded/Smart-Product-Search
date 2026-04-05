import type { CSSProperties } from 'react'

import { Outlet } from 'react-router-dom'

import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { Footer } from '@/widgets/Footer'
import { Sidebar } from '@/widgets/Sidebar'

export function AppLayout() {
  return (
    <SidebarProvider
      defaultOpen
      style={
        {
          '--sidebar-width': '280px',
          '--sidebar-width-icon': '76px',
        } as CSSProperties
      }
    >
      <Sidebar />

      <SidebarInset className="min-h-screen bg-background text-foreground">
        <div className="flex min-h-screen min-w-0 flex-col">
          <div className="border-b border-[var(--semantic-border-default)] bg-[var(--semantic-background-elevated)] md:hidden">
            <div className="mx-auto flex w-full max-w-[1280px] px-4 py-3 sm:px-6">
              <SidebarTrigger className="border border-[var(--semantic-border-default)] bg-[var(--semantic-background-elevated)] text-[var(--semantic-text-primary)] hover:bg-[var(--semantic-control-hover)] hover:text-[var(--semantic-text-primary)]" />
            </div>
          </div>

          <main className="flex-1 px-4 py-6 sm:px-6 xl:px-8">
            <div className="mx-auto w-full max-w-[1280px]">
              <Outlet />
            </div>
          </main>

          <Footer />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
