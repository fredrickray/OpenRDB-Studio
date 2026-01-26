import { Link, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"
import {
    Database,
    Terminal,
    Table,
    Settings,
    FileCode,
    BookOpen,
} from "lucide-react"

interface NavItem {
    icon: React.ReactNode
    label: string
    href: string
}

const navItems: NavItem[] = [
    { icon: <Database className="w-5 h-5" />, label: "Connections", href: "/" },
    { icon: <Terminal className="w-5 h-5" />, label: "Query", href: "/query" },
    { icon: <Table className="w-5 h-5" />, label: "Tables", href: "/tables" },
    { icon: <FileCode className="w-5 h-5" />, label: "DDL", href: "/ddl" },
    { icon: <BookOpen className="w-5 h-5" />, label: "Docs", href: "/docs" },
]

export function AppSidebar() {
    const location = useLocation()
    const currentPath = location.pathname

    return (
        <div className="w-14 h-full bg-sidebar border-r border-border flex flex-col items-center py-4 shrink-0">
            {/* Logo */}
            <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center mb-6">
                <Database className="w-5 h-5 text-primary" />
            </div>

            {/* Navigation Items */}
            <nav className="flex-1 flex flex-col items-center gap-2">
                {navItems.map((item) => (
                    <Link
                        key={item.href}
                        to={item.href}
                        className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                            currentPath === item.href || (currentPath.startsWith(item.href) && item.href !== "/")
                                ? "bg-primary/20 text-primary"
                                : "text-muted-foreground hover:bg-accent hover:text-foreground"
                        )}
                        title={item.label}
                    >
                        {item.icon}
                    </Link>
                ))}
            </nav>

            {/* Settings at bottom */}
            <div className="flex flex-col items-center gap-2">
                <Link
                    to="/settings"
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    title="Settings"
                >
                    <Settings className="w-5 h-5" />
                </Link>
            </div>
        </div>
    )
}
