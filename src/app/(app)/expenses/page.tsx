
"use client";

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, Loader2, Filter, X } from 'lucide-react';
import { addExpense, getExpenses, updateExpense, deleteExpense, getExpensesByDateRange } from '@/services/expenseService';
import type { Expense, ExpenseFormData, ExpenseCategory, ExpenseStatus } from '@/lib/schemas/expense';
import { expenseCategories } from '@/lib/schemas/expense';
import { useToast } from '@/hooks/use-toast';
import { ExpenseForm } from '@/components/finance/expense-form';
import { ExpensesTable } from '@/components/finance/expenses-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, parseISO } from 'date-fns';

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
const months = [
  { value: 1, label: 'Janeiro' }, { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' }, { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' }, { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' }, { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' }, { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' }, { value: 12, label: 'Dezembro' }
];

export default function ExpensesPage() {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [filters, setFilters] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    category: 'all',
    status: 'all',
  });

  const queryKey = ['expenses', filters];

  const { data: expenses, isLoading, error } = useQuery<Expense[], Error>({
    queryKey,
    queryFn: () => getExpenses(filters as any),
  });

  const { mutate: addExpenseMutation, isPending: isAdding } = useMutation({
    mutationFn: (expenseData: ExpenseFormData) => {
      const dataToSave = {
        ...expenseData,
        dueDate: parseISO(expenseData.dueDate),
        paymentDate: expenseData.paymentDate ? parseISO(expenseData.paymentDate) : null,
        amount: parseFloat(String(expenseData.amount).replace(',', '.'))
      };
      return addExpense(dataToSave as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast({ title: "Despesa Adicionada", description: "A nova despesa foi adicionada com sucesso." });
      setIsSheetOpen(false);
    },
    onError: (err) => {
      toast({ title: "Erro ao Adicionar", description: err.message, variant: "destructive" });
    },
  });

  const { mutate: updateExpenseMutation, isPending: isUpdating } = useMutation({
    mutationFn: ({ id, expenseData }: { id: string; expenseData: ExpenseFormData }) => {
      const dataToUpdate = {
        ...expenseData,
        dueDate: parseISO(expenseData.dueDate),
        paymentDate: expenseData.paymentDate ? parseISO(expenseData.paymentDate) : null,
        amount: parseFloat(String(expenseData.amount).replace(',', '.'))
      };
      return updateExpense(id, dataToUpdate as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast({ title: "Despesa Atualizada", description: "Os dados da despesa foram atualizados." });
      setIsSheetOpen(false);
      setSelectedExpense(null);
    },
    onError: (err) => {
      toast({ title: "Erro ao Atualizar", description: err.message, variant: "destructive" });
    },
  });
  
  const { mutate: toggleStatusMutation, isPending: isToggling, variables: togglingId } = useMutation({
    mutationFn: ({ expenseId, currentStatus, paymentDate }: { expenseId: string; currentStatus: ExpenseStatus; paymentDate?: Date }) => {
        const newStatus: ExpenseStatus = currentStatus === 'Pendente' ? 'Pago' : 'Pendente';
        const newPaymentDate = newStatus === 'Pago' ? (paymentDate || new Date()) : null;
        return updateExpense(expenseId, { status: newStatus, paymentDate: newPaymentDate });
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['expenses'] });
        toast({ title: "Status Alterado", description: "O status da despesa foi atualizado." });
    },
    onError: (err) => {
        toast({ title: "Erro ao Alterar Status", description: err.message, variant: "destructive" });
    },
  });


  const { mutate: deleteExpenseMutation, isPending: isDeleting, variables: deletingId } = useMutation({
    mutationFn: (id: string) => deleteExpense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast({ title: "Despesa Excluída", description: "A despesa foi removida permanentemente." });
    },
    onError: (err) => {
      toast({ title: "Erro ao Excluir", description: err.message, variant: "destructive" });
    },
  });

  const handleFormSubmit = async (data: ExpenseFormData) => {
    if (selectedExpense && selectedExpense.id) {
      updateExpenseMutation({ id: selectedExpense.id, expenseData: data });
    } else {
      addExpenseMutation(data);
    }
  };

  const handleEdit = (expense: Expense) => {
    setSelectedExpense(expense);
    setIsSheetOpen(true);
  };
  
  const handleFilterChange = (filterName: keyof typeof filters, value: string | number) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const clearFilters = () => {
    setFilters({
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      category: 'all',
      status: 'all',
    });
  };

  const hasActiveFilters = filters.category !== 'all' || filters.status !== 'all';

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-headline text-3xl font-semibold text-accent">Controle de Despesas</h1>
        <Sheet open={isSheetOpen} onOpenChange={(open) => {
          setIsSheetOpen(open);
          if (!open) setSelectedExpense(null);
        }}>
          <SheetTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Adicionar Despesa
            </Button>
          </SheetTrigger>
          <SheetContent className="sm:max-w-lg">
            <SheetHeader>
              <SheetTitle>{selectedExpense ? "Editar Despesa" : "Adicionar Nova Despesa"}</SheetTitle>
              <SheetDescription>
                {selectedExpense ? "Altere os dados da despesa abaixo." : "Preencha os dados da nova despesa."}
              </SheetDescription>
            </SheetHeader>
            <ExpenseForm
              onSubmit={handleFormSubmit}
              defaultValues={selectedExpense ? {
                ...selectedExpense,
                amount: selectedExpense.amount, // Keep as number
                dueDate: format(selectedExpense.dueDate, 'yyyy-MM-dd'),
                paymentDate: selectedExpense.paymentDate ? format(selectedExpense.paymentDate, 'yyyy-MM-dd') : null
              } : undefined}
              isEditing={!!selectedExpense}
              isLoading={isAdding || isUpdating}
              onClose={() => setIsSheetOpen(false)}
            />
          </SheetContent>
        </Sheet>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5"/>
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* Month Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Mês</label>
            <Select value={String(filters.month)} onValueChange={(v) => handleFilterChange('month', Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {months.map(m => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {/* Year Filter */}
           <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Ano</label>
            <Select value={String(filters.year)} onValueChange={(v) => handleFilterChange('year', Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {/* Category Filter */}
           <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Categoria</label>
            <Select value={filters.category} onValueChange={(v) => handleFilterChange('category', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {expenseCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {/* Status Filter */}
           <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Status</label>
            <Select value={filters.status} onValueChange={(v) => handleFilterChange('status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="Pendente">Pendente</SelectItem>
                <SelectItem value="Pago">Pago</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* Clear Filters Button */}
          {hasActiveFilters && (
             <div className="flex flex-col gap-1.5 justify-end">
                <Button variant="ghost" onClick={clearFilters}>
                    <X className="mr-2 h-4 w-4" />
                    Limpar Filtros
                </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <ExpensesTable
        expenses={expenses || []}
        onEdit={handleEdit}
        onDelete={(id) => deleteExpenseMutation(id)}
        onToggleStatus={(id, status, pDate) => toggleStatusMutation({ expenseId: id, currentStatus: status, paymentDate: pDate })}
        isLoading={isLoading}
        isLoadingDeleteForId={isDeleting ? deletingId : null}
        isLoadingToggleForId={isToggling ? togglingId.expenseId : null}
      />
    </div>
  );
}
