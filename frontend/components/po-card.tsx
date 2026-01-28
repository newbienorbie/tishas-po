import { PODocument, POItem } from "@/lib/types";
import { savePO } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { LineItemsEditor } from "./line-items-editor";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, ExternalLink, Save, CheckCircle2, Trash2, Eye, EyeOff, AlertTriangle } from "lucide-react";

interface POCardProps {
    doc: PODocument;
    onSaved: () => void;
    onRemove: () => void;
    onDocChange?: (doc: PODocument) => void;  // NEW: notify parent of changes
}

// Helper function to calculate line items sum
function calculateItemsSum(items: POItem[] = []): number {
    return items.reduce((sum, item) => {
        const itemTotal = item.total_price || item.total || 0;
        return sum + (typeof itemTotal === 'number' ? itemTotal : parseFloat(itemTotal) || 0);
    }, 0);
}

// Helper function to check if amounts match (with tolerance) or if total is missing
function checkAmountMismatch(items: POItem[] = [], totalAmount: number | string | undefined): { is_flagged: boolean, flag_reason: string | undefined } {
    const itemsSum = calculateItemsSum(items);
    const total = typeof totalAmount === 'number' ? totalAmount : parseFloat(String(totalAmount)) || 0;

    // Flag if total amount is missing or zero
    if (total === 0 || totalAmount === null || totalAmount === undefined || totalAmount === '') {
        return {
            is_flagged: true,
            flag_reason: 'Total amount is missing or zero'
        };
    }

    if (items.length === 0) {
        return { is_flagged: false, flag_reason: undefined };
    }

    const tolerance = 1.0; // RM1 tolerance
    const difference = Math.abs(itemsSum - total);

    if (difference >= tolerance) {
        return {
            is_flagged: true,
            flag_reason: `Line items sum (${itemsSum.toFixed(2)}) differs from total amount (${total.toFixed(2)}) by ${difference.toFixed(2)}`
        };
    }
    return { is_flagged: false, flag_reason: undefined };
}

export function POCard({ doc: initialDoc, onSaved, onRemove, onDocChange }: POCardProps) {
    const [doc, setDoc] = useState<PODocument>(initialDoc);
    const [isItemsOpen, setIsItemsOpen] = useState(true); // Changed to true - expanded by default
    const [isSaving, setIsSaving] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);

    // Recalculate flagging whenever total_amount or items change
    useEffect(() => {
        const { is_flagged, flag_reason } = checkAmountMismatch(doc.items, doc.total_amount);
        if (doc.is_flagged !== is_flagged || doc.flag_reason !== flag_reason) {
            const updatedDoc = { ...doc, is_flagged, flag_reason };
            setDoc(updatedDoc);
            onDocChange?.(updatedDoc);
        }
    }, [doc.total_amount, doc.items]);

    const handleChange = (field: string, value: any) => {
        const updatedDoc = { ...doc, [field]: value };
        setDoc(updatedDoc);
        onDocChange?.(updatedDoc);
    };

    const handleSave = async () => {
        setIsSaving(true);
        const success = await savePO(doc);
        setIsSaving(false);
        if (success) {
            setIsSaved(true);
            toast.success(`PO ${doc.po_number || "Unknown"} saved!`);
            setTimeout(() => {
                onSaved();
            }, 1000);
        } else {
            toast.error("Failed to save PO.");
        }
    };

    return (
        <Card className="mb-4 border-l-4 border-l-blue-500 shadow-sm">
            <CardHeader className="pb-2 bg-gray-50/50 dark:bg-zinc-900/50">
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-3">
                    <div
                        className="flex flex-col gap-0.5 md:gap-1 flex-1 min-w-0 cursor-pointer"
                        onClick={() => setIsMinimized(!isMinimized)}
                    >
                        <div className="flex items-center gap-2 flex-wrap">
                            <div className="h-6 w-6 shrink-0 flex items-center justify-center">
                                {isMinimized ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                            </div>
                            <CardTitle className="text-lg font-bold break-words">
                                {doc.po_number || "New PO"}
                            </CardTitle>
                            {/* Trash button on mobile - next to PO number */}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 md:hidden text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 shrink-0"
                                onClick={onRemove}
                            >
                                <Trash2 className="h-3 w-3" />
                            </Button>
                            {doc.already_exists && (
                                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200 gap-1 shrink-0">
                                    <AlertTriangle className="h-3 w-3" /> Duplicate
                                </Badge>
                            )}
                            {isSaved && (
                                <div className="flex items-center gap-1 text-green-600 dark:text-green-400 shrink-0">
                                    <CheckCircle2 className="h-4 w-4" />
                                    <span className="text-xs font-medium">SAVED</span>
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2 ml-0 md:ml-8">
                            <span className="text-sm font-normal text-muted-foreground break-words">
                                {doc.retailer_name_standardized || doc.retailer_name || "Unknown Retailer"}
                            </span>
                            {/* Filename as clickable link on mobile, plain text on desktop */}
                            {doc.file_path_url ? (
                                <>
                                    <a
                                        href={doc.file_path_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="md:hidden text-sm text-muted-foreground hover:underline break-all flex items-center gap-1"
                                    >
                                        <ExternalLink className="h-3 w-3 shrink-0" />
                                        {doc.source_filename}
                                    </a>
                                    <span className="hidden md:inline text-sm text-muted-foreground break-all">
                                        {doc.source_filename}
                                    </span>
                                </>
                            ) : (
                                <span className="text-sm text-muted-foreground break-all">
                                    {doc.source_filename}
                                </span>
                            )}
                        </div>
                    </div>
                    {/* Desktop: View button and trash button */}
                    <div className="hidden md:flex items-center gap-2 shrink-0">
                        {doc.file_path_url && (
                            <a href={doc.file_path_url} target="_blank" rel="noopener noreferrer">
                                <Button variant="ghost" size="sm" className="h-8">
                                    <ExternalLink className="h-4 w-4 mr-1" />
                                    {doc.source_filename || "View Source"}
                                </Button>
                            </a>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={onRemove}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </CardHeader>

            {!isMinimized && (
                <CardContent className="pt-4 px-3 md:px-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                        {/* Column 1: Retailer Info */}
                        <div className="space-y-2">
                            <h4 className="font-semibold text-sm text-primary/80">Retailer Info</h4>
                            <div>
                                <Label className="text-xs text-muted-foreground">Debtor Code</Label>
                                <Input value={doc.debtor_code || ""} onChange={e => handleChange("debtor_code", e.target.value)} className="h-8" />
                            </div>
                            <div>
                                <Label className="text-xs text-muted-foreground">Branch Name</Label>
                                <Input value={doc.branch_name || ""} onChange={e => handleChange("branch_name", e.target.value)} className="h-8" />
                            </div>
                            <div>
                                <Label className="text-xs text-muted-foreground">Branch Code</Label>
                                <Input value={doc.branch_code || ""} onChange={e => handleChange("branch_code", e.target.value)} className="h-8" />
                            </div>
                            <div>
                                <Label className="text-xs text-muted-foreground">Buyer Name</Label>
                                <Input value={doc.buyer_name || ""} onChange={e => handleChange("buyer_name", e.target.value)} className="h-8" />
                            </div>
                        </div>

                        {/* Column 2: Logistics */}
                        <div className="space-y-2">
                            <h4 className="font-semibold text-sm text-primary/80">Logistics & Tax</h4>
                            <div>
                                <Label className="text-xs text-muted-foreground">PO Number</Label>
                                <Input value={doc.po_number || ""} onChange={e => handleChange("po_number", e.target.value)} className="h-8" />
                            </div>
                            <div>
                                <Label className="text-xs text-muted-foreground">Delivery Address</Label>
                                <Textarea value={doc.delivery_address || ""} onChange={e => handleChange("delivery_address", e.target.value)} className="min-h-[60px] text-xs resize-y" />
                            </div>
                            <div>
                                <Label className="text-xs text-muted-foreground">Billing Address</Label>
                                <Textarea value={doc.billing_address || ""} onChange={e => handleChange("billing_address", e.target.value)} className="min-h-[60px] text-xs resize-y" placeholder="Same as delivery if not specified" />
                            </div>
                            <div>
                                <Label className="text-xs text-muted-foreground">Tax ID</Label>
                                <Input value={doc.tax_id || ""} onChange={e => handleChange("tax_id", e.target.value)} className="h-8" />
                            </div>
                        </div>

                        {/* Column 3: Dates & Financials */}
                        <div className="space-y-2">
                            <h4 className="font-semibold text-sm text-primary/80">Dates & Financials</h4>
                            <div>
                                <Label className="text-xs text-muted-foreground">PO Date</Label>
                                <Input value={doc.po_date || ""} onChange={e => handleChange("po_date", e.target.value)} className="h-8" />
                            </div>
                            <div>
                                <Label className="text-xs text-muted-foreground">Delivery Date</Label>
                                <Input value={doc.delivery_date || ""} onChange={e => handleChange("delivery_date", e.target.value)} className="h-8" />
                            </div>
                            <div>
                                <Label className="text-xs text-muted-foreground">Expiry Date</Label>
                                <Input value={doc.expiry_date || ""} onChange={e => handleChange("expiry_date", e.target.value)} className="h-8" />
                            </div>
                            <div>
                                <Label className="text-xs text-muted-foreground">Total Amount</Label>
                                <Input value={doc.total_amount || ""} onChange={e => handleChange("total_amount", e.target.value)} className="h-8 font-bold" />
                            </div>
                            {doc.is_flagged && (
                                <div className="flex items-start gap-2 p-2 bg-orange-50 dark:bg-orange-900/20 rounded text-orange-700 dark:text-orange-400 text-xs">
                                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                                    <span>{doc.flag_reason}</span>
                                </div>
                            )}
                        </div>

                        {/* Column 4: Actions */}
                        <div className="flex flex-col justify-end gap-2">
                            <Button onClick={handleSave} disabled={isSaving || isSaved} className="w-full">
                                {isSaving ? "Saving..." : isSaved ? <><CheckCircle2 className="mr-2 h-4 w-4" /> Saved</> : <><Save className="mr-2 h-4 w-4" /> Save to Database</>}
                            </Button>
                            <Button variant="outline" onClick={() => setIsItemsOpen(!isItemsOpen)} className="w-full">
                                {isItemsOpen ? <ChevronUp className="mr-2 h-4 w-4" /> : <ChevronDown className="mr-2 h-4 w-4" />}
                                {isItemsOpen ? "Hide Items" : "Edit Line Items"}
                            </Button>
                        </div>
                    </div>

                    {isItemsOpen && (
                        <div className="mt-4 border-t pt-4">
                            <LineItemsEditor items={doc.items || []} onChange={(items) => handleChange("items", items)} />
                        </div>
                    )}

                </CardContent>
            )}
        </Card>
    );
}
