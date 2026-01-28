import { PODocument } from "@/lib/types";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { ExternalLink, ArrowUpDown, ArrowUp, ArrowDown, RotateCw, Download, FileSpreadsheet, ToggleLeft, ToggleRight, AlertTriangle, Loader2 } from "lucide-react";
import { formatNumber, formatQuantity } from "@/lib/utils";
import { exportCSV, checkGoogleAuthStatus, initiateGoogleAuth, exportToGoogleSheets } from "@/lib/api";
import { toast } from "sonner";

interface HistoryTableProps {
    data: PODocument[];
    onRefresh?: () => void;
    isRefreshing?: boolean;
}

type SortDirection = 'asc' | 'desc';
type ViewMode = 'po_level' | 'item_level';

export function HistoryTable({ data, onRefresh, isRefreshing = false }: HistoryTableProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [sortColumn, setSortColumn] = useState<keyof PODocument | null>(null);
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
    const [viewMode, setViewMode] = useState<ViewMode>('item_level');
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [isExporting, setIsExporting] = useState(false);
    const [isGoogleAuthenticated, setIsGoogleAuthenticated] = useState(false);
    const [isGSheetsExporting, setIsGSheetsExporting] = useState(false);

    // Check Google auth status on mount
    useEffect(() => {
        checkGoogleAuthStatus().then(setIsGoogleAuthenticated);
    }, []);

    const itemsPerPage = 20;

    // Filter by search and date
    const filteredData = data.filter((doc) => {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = (
            (doc.po_number?.toLowerCase() || "").includes(searchLower) ||
            (doc.retailer_name?.toLowerCase() || "").includes(searchLower) ||
            (doc.branch_name?.toLowerCase() || "").includes(searchLower) ||
            (doc.debtor_code?.toLowerCase() || "").includes(searchLower)
        );

        // Date filtering
        let matchesDate = true;
        const poDate = doc.po_date;
        if (startDate && poDate) {
            matchesDate = matchesDate && poDate >= startDate;
        }
        if (endDate && poDate) {
            matchesDate = matchesDate && poDate <= endDate;
        }
        // If only startDate is set with no endDate, treat as single day filter
        if (startDate && !endDate && poDate) {
            matchesDate = poDate === startDate;
        }

        return matchesSearch && matchesDate;
    });

    // Aggregate for PO level view
    const getDisplayData = () => {
        if (viewMode === 'item_level') return filteredData;

        // Group by PO number for PO level view
        const poMap = new Map<string, PODocument>();
        for (const doc of filteredData) {
            const poNum = doc.po_number || 'unknown';
            if (!poMap.has(poNum)) {
                poMap.set(poNum, { ...doc });
            }
        }
        return Array.from(poMap.values());
    };

    const displayData = getDisplayData();

    // Sort
    const sortedData = [...displayData].sort((a, b) => {
        if (!sortColumn) return 0;

        let valA = a[sortColumn];
        let valB = b[sortColumn];

        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        if (valA === valB) return 0;

        const comparison = valA! > valB! ? 1 : -1;
        return sortDirection === 'asc' ? comparison : -comparison;
    });

    const totalItems = sortedData.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
    const currentData = sortedData.slice(startIndex, startIndex + itemsPerPage);

    const handleSort = (column: keyof PODocument) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    const handleExportCSV = async () => {
        setIsExporting(true);
        try {
            await exportCSV(startDate || undefined, endDate || undefined);
            toast.success("CSV exported successfully");
        } catch (error) {
            toast.error("Failed to export CSV");
        } finally {
            setIsExporting(false);
        }
    };

    const handleOpenGSheets = async () => {
        setIsGSheetsExporting(true);
        try {
            // Check if we're authenticated
            const isAuth = await checkGoogleAuthStatus();

            if (!isAuth) {
                // Not authenticated - initiate OAuth flow
                toast.info("Connecting to Google...");
                const authUrl = await initiateGoogleAuth();
                window.location.href = authUrl;
                return;
            }

            // Authenticated - export to Google Sheets
            toast.info("Creating Google Sheet...");
            const spreadsheetUrl = await exportToGoogleSheets(
                startDate || undefined,
                endDate || undefined,
                viewMode
            );

            toast.success("Google Sheet created!");
            window.open(spreadsheetUrl, '_blank');

        } catch (error: any) {
            if (error.message === 'NOT_AUTHENTICATED') {
                // Session expired - re-authenticate
                const authUrl = await initiateGoogleAuth();
                window.location.href = authUrl;
            } else {
                toast.error(error.message || "Failed to export to Google Sheets");
            }
        } finally {
            setIsGSheetsExporting(false);
        }
    };

    const SortIcon = ({ column }: { column: keyof PODocument }) => {
        if (sortColumn !== column) return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
        return sortDirection === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />;
    };

    // Mobile card view for each PO
    const MobileCard = ({ doc }: { doc: PODocument }) => (
        <Card className={`mb-3 ${doc.is_flagged ? 'border-l-4 border-l-orange-500' : ''}`}>
            <CardHeader className="py-3 px-4">
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-base font-bold">{doc.po_number || "N/A"}</CardTitle>
                        <p className="text-sm text-muted-foreground">{doc.retailer_name}</p>
                    </div>
                    <div className="text-right">
                        <p className="font-bold">{formatNumber(doc.total_amount)}</p>
                        <p className="text-xs text-muted-foreground">{doc.currency || 'MYR'}</p>
                    </div>
                </div>
                {doc.is_flagged && (
                    <div className="flex items-center gap-1 text-orange-600 text-xs mt-1">
                        <AlertTriangle className="h-3 w-3" />
                        <span>{doc.flag_reason}</span>
                    </div>
                )}
            </CardHeader>
            <CardContent className="py-2 px-4 text-sm space-y-1">
                <div className="grid grid-cols-2 gap-2">
                    <div><span className="text-muted-foreground">Debtor:</span> {doc.debtor_code || '-'}</div>
                    <div><span className="text-muted-foreground">Branch:</span> {doc.branch_name || '-'}</div>
                    <div><span className="text-muted-foreground">PO Date:</span> {doc.po_date || '-'}</div>
                    <div><span className="text-muted-foreground">Delivery:</span> {doc.delivery_date || '-'}</div>
                </div>
                {viewMode === 'item_level' && (
                    <div className="border-t pt-2 mt-2">
                        <p className="text-xs text-muted-foreground mb-1">Item Details:</p>
                        <div className="grid grid-cols-2 gap-1 text-xs">
                            <div>{(doc as any).article_code || '-'}</div>
                            <div className="text-right">{formatQuantity((doc as any).qty)} x {formatNumber((doc as any).unit_price)}</div>
                        </div>
                        <p className="text-xs truncate">{(doc as any).article_description || '-'}</p>
                    </div>
                )}
                {doc.file_path_url && (
                    <a href={doc.file_path_url} target="_blank" rel="noopener noreferrer" className="text-primary text-xs flex items-center gap-1 mt-2">
                        <ExternalLink className="h-3 w-3" /> View Source
                    </a>
                )}
            </CardContent>
        </Card>
    );

    return (
        <div className="space-y-4">
            {/* Controls Row 1: Search and Refresh */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <Input
                        placeholder="Search by PO Number, Retailer, Debtor Code, or Branch"
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="w-full md:min-w-[400px]"
                    />
                    <Button
                        variant="outline"
                        onClick={onRefresh}
                        disabled={isRefreshing}
                        title="Refresh"
                        className="gap-2 shrink-0"
                    >
                        <RotateCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">Refresh</span>
                    </Button>
                </div>

                <div className="text-sm text-muted-foreground whitespace-nowrap">
                    {totalItems > 0 ? (
                        <span>Showing {startIndex + 1} to {endIndex} of {totalItems} entries</span>
                    ) : (
                        <span>No entries found</span>
                    )}
                </div>
            </div>

            {/* Controls Row 2: View Toggle, Date Filters, Export Buttons */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 p-3 bg-gray-50 dark:bg-zinc-900/50 rounded-lg">
                {/* View Mode Toggle */}
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">View:</span>
                    <Button
                        variant={viewMode === 'po_level' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setViewMode('po_level')}
                    >
                        PO Summary
                    </Button>
                    <Button
                        variant={viewMode === 'item_level' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setViewMode('item_level')}
                    >
                        Item Details
                    </Button>
                </div>

                {/* Date Filters */}
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-muted-foreground">Filter by date:</span>
                    <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-[140px] h-9"
                        placeholder="Start Date"
                    />
                    <span className="text-muted-foreground">to</span>
                    <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-[140px] h-9"
                        placeholder="End Date"
                    />
                </div>

                {/* Export Buttons */}
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportCSV}
                        disabled={isExporting}
                        className="gap-1"
                    >
                        <Download className="h-4 w-4" />
                        <span className="hidden sm:inline">Export CSV</span>
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleOpenGSheets}
                        disabled={isGSheetsExporting}
                        className="gap-1"
                    >
                        {isGSheetsExporting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <FileSpreadsheet className="h-4 w-4" />
                        )}
                        <span className="hidden sm:inline">
                            {isGSheetsExporting ? "Exporting..." : "Open in GSheets"}
                        </span>
                    </Button>
                </div>
            </div>

            {/* Mobile Card View */}
            <div className="block md:hidden">
                {currentData.length > 0 ? (
                    currentData.map((doc, idx) => <MobileCard key={idx} doc={doc} />)
                ) : (
                    <div className="text-center py-10 text-muted-foreground">No records found.</div>
                )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block rounded-md border overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="min-w-[120px] cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('po_number')}>
                                <div className="flex items-center">PO Number <SortIcon column="po_number" /></div>
                            </TableHead>
                            <TableHead className="min-w-[150px] cursor-pointer hover:bg-muted/50" onClick={() => handleSort('retailer_name')}>
                                <div className="flex items-center">Retailer <SortIcon column="retailer_name" /></div>
                            </TableHead>
                            <TableHead className="min-w-[100px] cursor-pointer hover:bg-muted/50" onClick={() => handleSort('debtor_code')}>
                                <div className="flex items-center">Debtor <SortIcon column="debtor_code" /></div>
                            </TableHead>
                            <TableHead className="min-w-[150px] cursor-pointer hover:bg-muted/50" onClick={() => handleSort('branch_name')}>
                                <div className="flex items-center">Branch <SortIcon column="branch_name" /></div>
                            </TableHead>
                            <TableHead className="min-w-[100px] cursor-pointer hover:bg-muted/50" onClick={() => handleSort('branch_code')}>
                                <div className="flex items-center">Branch Code <SortIcon column="branch_code" /></div>
                            </TableHead>
                            <TableHead className="min-w-[100px] cursor-pointer hover:bg-muted/50" onClick={() => handleSort('po_date')}>
                                <div className="flex items-center">PO Date <SortIcon column="po_date" /></div>
                            </TableHead>
                            <TableHead className="min-w-[100px] cursor-pointer hover:bg-muted/50" onClick={() => handleSort('delivery_date')}>
                                <div className="flex items-center">Delivery <SortIcon column="delivery_date" /></div>
                            </TableHead>
                            <TableHead className="min-w-[100px] cursor-pointer hover:bg-muted/50" onClick={() => handleSort('expiry_date')}>
                                <div className="flex items-center">Expiry <SortIcon column="expiry_date" /></div>
                            </TableHead>
                            <TableHead className="min-w-[150px]">Delivery Address</TableHead>
                            <TableHead className="min-w-[150px]">Billing Address</TableHead>
                            <TableHead className="min-w-[100px] cursor-pointer hover:bg-muted/50" onClick={() => handleSort('total_amount')}>
                                <div className="flex items-center">Total <SortIcon column="total_amount" /></div>
                            </TableHead>
                            {viewMode === 'item_level' && (
                                <>
                                    <TableHead className="min-w-[110px]">Article Code</TableHead>
                                    <TableHead className="min-w-[200px]">Description</TableHead>
                                    <TableHead className="min-w-[70px]">Qty</TableHead>
                                    <TableHead className="min-w-[70px]">UOM</TableHead>
                                    <TableHead className="min-w-[90px]">Unit Price</TableHead>
                                    <TableHead className="min-w-[90px]">Line Total</TableHead>
                                </>
                            )}
                            <TableHead className="min-w-[140px]">Source</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {currentData.length > 0 ? (
                            currentData.map((doc, idx) => (
                                <TableRow key={idx} className={doc.is_flagged ? 'bg-orange-50 dark:bg-orange-900/10' : ''}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-1">
                                            {doc.po_number || "-"}
                                            {doc.is_flagged && <span title={doc.flag_reason}><AlertTriangle className="h-4 w-4 text-orange-500" /></span>}
                                        </div>
                                    </TableCell>
                                    <TableCell>{doc.retailer_name || "-"}</TableCell>
                                    <TableCell>{doc.debtor_code || "-"}</TableCell>
                                    <TableCell>{doc.branch_name || "-"}</TableCell>
                                    <TableCell>{doc.branch_code || "-"}</TableCell>
                                    <TableCell>{doc.po_date || "-"}</TableCell>
                                    <TableCell>{doc.delivery_date || "-"}</TableCell>
                                    <TableCell>{doc.expiry_date || "-"}</TableCell>
                                    <TableCell className="max-w-[150px] truncate" title={doc.delivery_address}>{doc.delivery_address || "-"}</TableCell>
                                    <TableCell className="max-w-[150px] truncate" title={doc.billing_address}>{doc.billing_address || "-"}</TableCell>
                                    <TableCell>{formatNumber(doc.total_amount)}</TableCell>
                                    {viewMode === 'item_level' && (
                                        <>
                                            <TableCell>{(doc as any).article_code || "-"}</TableCell>
                                            <TableCell className="max-w-[200px] truncate" title={(doc as any).article_description}>
                                                {(doc as any).article_description || "-"}
                                            </TableCell>
                                            <TableCell>{formatQuantity((doc as any).qty)}</TableCell>
                                            <TableCell>{(doc as any).uom || "-"}</TableCell>
                                            <TableCell>{formatNumber((doc as any).unit_price)}</TableCell>
                                            <TableCell>{formatNumber((doc as any).line_total)}</TableCell>
                                        </>
                                    )}
                                    <TableCell>
                                        {doc.file_path_url || doc.file_storage_url ? (
                                            <a href={doc.file_path_url || doc.file_storage_url} target="_blank" rel="noopener noreferrer">
                                                <Button variant="ghost" size="sm" className="hover:underline cursor-pointer">
                                                    <ExternalLink className="h-3 w-3 mr-1" />
                                                    {doc.source_filename || "View"}
                                                </Button>
                                            </a>
                                        ) : "-"}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={viewMode === 'item_level' ? 15 : 9} className="text-left h-24 text-muted-foreground">
                                    No records found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="text-xs text-muted-foreground">
                💡 Tip: Click headers to sort | Use PO Summary for one row per PO
            </div>

            {totalPages > 1 && (
                <div className="flex items-center justify-end space-x-2 py-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                    >
                        Previous
                    </Button>
                    <div className="text-sm">
                        Page {currentPage} of {totalPages}
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                    >
                        Next
                    </Button>
                </div>
            )}
        </div>
    );
}
