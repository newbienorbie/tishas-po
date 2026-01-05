import { PODocument } from "@/lib/types";
import { savePO } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { LineItemsEditor } from "./line-items-editor";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, ExternalLink, Save, CheckCircle2, Trash2, Eye, EyeOff, AlertTriangle } from "lucide-react";

interface POCardProps {
    doc: PODocument;
    onSaved: () => void;
    onRemove: () => void;
}

export function POCard({ doc: initialDoc, onSaved, onRemove }: POCardProps) {
    const [doc, setDoc] = useState<PODocument>(initialDoc);
    const [isItemsOpen, setIsItemsOpen] = useState(true); // Changed to true - expanded by default
    const [isSaving, setIsSaving] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);

    const handleChange = (field: string, value: any) => {
        setDoc((prev) => ({ ...prev, [field]: value }));
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
                    <div className="flex flex-col gap-0.5 md:gap-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 shrink-0"
                                onClick={() => setIsMinimized(!isMinimized)}
                            >
                                {isMinimized ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                            </Button>
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
                                <Textarea value={doc.delivery_address || ""} onChange={e => handleChange("delivery_address", e.target.value)} className="min-h-[80px] text-xs resize-y" />
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
