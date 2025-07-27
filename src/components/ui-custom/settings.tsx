import * as React from "react";
import { LucideIcon } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
    AlertDialog,
    AlertDialogTrigger,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogAction,
    AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

// Settings Group - Container for related settings
interface SettingsGroupProps {
    title: string;
    description?: string;
    icon?: LucideIcon;
    children: React.ReactNode;
    className?: string;
}

export function SettingsGroup({
    title,
    description,
    icon: Icon,
    children,
    className,
}: SettingsGroupProps) {
    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle
                    className={cn("flex items-center gap-2", Icon && "")}
                >
                    {Icon && <Icon className="w-5 h-5" />}
                    {title}
                </CardTitle>
                {description && (
                    <p className="text-sm text-muted-foreground">
                        {description}
                    </p>
                )}
            </CardHeader>
            <CardContent className="space-y-6">{children}</CardContent>
        </Card>
    );
}

// Base Settings Item - Flexible container for any setting
interface SettingsItemProps {
    label: string;
    description?: string;
    children: React.ReactNode;
    className?: string;
}

export function SettingsItem({
    label,
    description,
    children,
    className,
}: SettingsItemProps) {
    return (
        <div
            className={cn(
                "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3",
                className
            )}
        >
            <div className="space-y-1">
                <Label className="text-sm font-medium">{label}</Label>
                {description && (
                    <p className="text-sm text-muted-foreground">
                        {description}
                    </p>
                )}
            </div>
            <div className="flex-shrink-0">{children}</div>
        </div>
    );
}

// Switch Setting - Toggle on/off
interface SettingsSwitchProps {
    label: string;
    description?: string;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    disabled?: boolean;
    className?: string;
}

export function SettingsSwitch({
    label,
    description,
    checked,
    onCheckedChange,
    disabled,
    className,
}: SettingsSwitchProps) {
    return (
        <SettingsItem
            label={label}
            description={description}
            className={className}
        >
            <Switch
                checked={checked}
                onCheckedChange={onCheckedChange}
                disabled={disabled}
            />
        </SettingsItem>
    );
}

// Select Setting - Dropdown selection
interface SelectOption {
    value: string;
    label: string;
}

interface SettingsSelectProps {
    label: string;
    description?: string;
    value: string;
    onValueChange: (value: string) => void;
    options: SelectOption[];
    placeholder?: string;
    disabled?: boolean;
    className?: string;
}

export function SettingsSelect({
    label,
    description,
    value,
    onValueChange,
    options,
    placeholder,
    disabled,
    className,
}: SettingsSelectProps) {
    return (
        <SettingsItem
            label={label}
            description={description}
            className={className}
        >
            <Select
                value={value}
                onValueChange={onValueChange}
                disabled={disabled}
            >
                <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent>
                    {options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </SettingsItem>
    );
}

// Action Setting - Button with confirmation
interface SettingsActionProps {
    label: string;
    description?: string;
    actionLabel: string;
    loadingLabel?: string;
    onAction: () => void;
    variant?:
        | "default"
        | "destructive"
        | "outline"
        | "secondary"
        | "ghost"
        | "link";
    icon?: LucideIcon;
    confirmDialog?: {
        title: string;
        description: string;
        actionLabel?: string;
    };
    disabled?: boolean;
    loading?: boolean;
    className?: string;
}

export function SettingsAction({
    label,
    description,
    actionLabel,
    loadingLabel,
    onAction,
    variant = "default",
    icon: Icon,
    confirmDialog,
    disabled,
    loading,
    className,
}: SettingsActionProps) {
    const button = (
        <Button
            variant={variant}
            size="sm"
            onClick={confirmDialog ? undefined : onAction}
            disabled={disabled || loading}
            className="flex items-center gap-2"
        >
            {Icon && <Icon className="h-3 w-3" />}
            {loading ? loadingLabel || actionLabel : actionLabel}
        </Button>
    );

    const content = (
        <SettingsItem
            label={label}
            description={description}
            className={className}
        >
            {confirmDialog ? (
                <AlertDialog>
                    <AlertDialogTrigger asChild>{button}</AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>
                                {confirmDialog.title}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                {confirmDialog.description}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={onAction}
                                className={cn(
                                    variant === "destructive" &&
                                        "bg-destructive hover:bg-destructive/90"
                                )}
                                disabled={loading}
                            >
                                {loading
                                    ? loadingLabel || actionLabel
                                    : confirmDialog.actionLabel || actionLabel}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            ) : (
                button
            )}
        </SettingsItem>
    );

    return content;
}

// Stats Setting - Display statistics
interface SettingsStatsProps {
    label: string;
    description?: string;
    stats: Array<{
        label: string;
        value: string | number;
        className?: string;
    }>;
    className?: string;
}

export function SettingsStats({
    label,
    description,
    stats,
    className,
}: SettingsStatsProps) {
    return (
        <div className={cn("space-y-4", className)}>
            {(label || description) && (
                <div>
                    {label && (
                        <Label className="text-sm font-medium">{label}</Label>
                    )}
                    {description && (
                        <p className="text-sm text-muted-foreground mt-1">
                            {description}
                        </p>
                    )}
                </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {stats.map((stat, index) => (
                    <div key={index} className={stat.className}>
                        <p className="text-muted-foreground text-sm">
                            {stat.label}
                        </p>
                        <p className="text-2xl font-semibold">{stat.value}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Section Divider - Visual separator with optional content
interface SettingsDividerProps {
    className?: string;
    children?: React.ReactNode;
}

export function SettingsDivider({ className, children }: SettingsDividerProps) {
    return <div className={cn("pt-4 border-t", className)}>{children}</div>;
}

// Alert Setting - Warning or info display
interface SettingsAlertProps {
    variant?: "default" | "warning" | "destructive";
    icon?: LucideIcon;
    children: React.ReactNode;
    className?: string;
}

export function SettingsAlert({
    variant = "default",
    icon: Icon,
    children,
    className,
}: SettingsAlertProps) {
    const variantStyles = {
        default:
            "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950",
        warning:
            "border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950",
        destructive:
            "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950",
    };

    const iconStyles = {
        default: "text-blue-600 dark:text-blue-400",
        warning: "text-yellow-600 dark:text-yellow-400",
        destructive: "text-red-600 dark:text-red-400",
    };

    return (
        <div
            className={cn(
                "flex items-start gap-2 p-3 border rounded-lg",
                variantStyles[variant],
                className
            )}
        >
            {Icon && (
                <Icon
                    className={cn(
                        "h-4 w-4 mt-0.5 flex-shrink-0",
                        iconStyles[variant]
                    )}
                />
            )}
            <div className="text-sm">{children}</div>
        </div>
    );
}
