import { GripVertical } from "lucide-react"
import { Panel, Group, Separator } from "react-resizable-panels"
import type { GroupProps } from "react-resizable-panels"

import { cn } from "@/lib/utils"

interface ResizablePanelGroupProps extends GroupProps { }

const ResizablePanelGroup = ({
    className,
    orientation = "horizontal",
    ...props
}: ResizablePanelGroupProps) => (
    <Group
        orientation={orientation}
        className={cn(
            "flex h-full w-full",
            orientation === "vertical" ? "flex-col" : "flex-row",
            className
        )}
        {...props}
    />
)

const ResizablePanel = Panel

const ResizableHandle = ({
    withHandle,
    className,
    ...props
}: React.ComponentProps<typeof Separator> & {
    withHandle?: boolean
}) => (
    <Separator
        className={cn(
            "relative flex items-center justify-center bg-border focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1",
            "data-[panel-group-direction=horizontal]:w-px data-[panel-group-direction=horizontal]:cursor-col-resize",
            "data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:cursor-row-resize",
            className
        )}
        {...props}
    >
        {withHandle && (
            <div className="z-10 flex h-4 w-3 items-center justify-center rounded-sm border bg-border">
                <GripVertical className="h-2.5 w-2.5" />
            </div>
        )}
    </Separator>
)

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }
