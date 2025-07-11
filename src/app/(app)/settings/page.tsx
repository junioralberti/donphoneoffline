
"use client";

import { useState, useEffect, type ChangeEvent, type FormEvent } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";
import { getEstablishmentSettings, saveEstablishmentSettings, type EstablishmentSettings } from "@/services/settingsService";
import { exportDatabase, importDatabase } from "@/services/backupService"; // Import backup services
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Building, Save, Loader2, AlertTriangle, RotateCcw, Pencil, Upload, Download, DatabaseZap } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format } from "date-fns";


export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isEditingEstablishmentData, setIsEditingEstablishmentData] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImportAlertOpen, setIsImportAlertOpen] = useState(false);


  // Form state variables
  const [businessName, setBusinessName] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [businessCnpj, setBusinessCnpj] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  // Logo related states removed

  const { data: establishmentSettings, isLoading: isLoadingSettings, error: settingsError, refetch: refetchEstablishmentSettings, isFetching: isFetchingSettings } = useQuery<EstablishmentSettings | null, Error>({
    queryKey: ["establishmentSettings"],
    queryFn: getEstablishmentSettings,
    refetchOnWindowFocus: false,
  });

  const populateFormFields = (settings: EstablishmentSettings | null) => {
    if (settings) {
      setBusinessName(settings.businessName || "");
      setBusinessAddress(settings.businessAddress || "");
      setBusinessCnpj(settings.businessCnpj || "");
      setBusinessPhone(settings.businessPhone || "");
      setBusinessEmail(settings.businessEmail || "");
      // Logo related state setting removed
    } else {
      setBusinessName("");
      setBusinessAddress("");
      setBusinessCnpj("");
      setBusinessPhone("");
      setBusinessEmail("");
      // Logo related state setting removed
    }
  };
  
  useEffect(() => {
    populateFormFields(establishmentSettings);
    if (!isLoadingSettings && !settingsError) {
      if (establishmentSettings) {
        setIsEditingEstablishmentData(false); 
      } else {
        setIsEditingEstablishmentData(true); 
      }
    } else if (settingsError) {
      setIsEditingEstablishmentData(true); 
    }
  }, [establishmentSettings, isLoadingSettings, settingsError]);


  const saveSettingsMutation = useMutation({
    mutationFn: (settingsData: Omit<EstablishmentSettings, 'updatedAt' | 'logoUrl'>) => 
      saveEstablishmentSettings(settingsData),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["establishmentSettings"] });
      toast({ title: "Sucesso!", description: "Dados do estabelecimento atualizados." });
      
      populateFormFields(data); 
      setIsEditingEstablishmentData(false); 
    },
    onError: (error: Error) => {
      console.error("Erro ao salvar dados do estabelecimento na página:", error);
      toast({ 
        title: "Erro ao Salvar", 
        description: `Falha ao salvar dados: ${error.message || 'Ocorreu um erro desconhecido.'}`, 
        variant: "destructive",
        duration: 7000,
      });
    },
  });


  const handleSaveEstablishmentData = async (e: FormEvent) => {
    e.preventDefault();
    const settingsToSave: Omit<EstablishmentSettings, 'updatedAt' | 'logoUrl'> = {
      businessName,
      businessAddress,
      businessCnpj,
      businessPhone,
      businessEmail,
    };
    saveSettingsMutation.mutate(settingsToSave);
  };

  const handleCancelEdit = () => {
    populateFormFields(establishmentSettings);
    setIsEditingEstablishmentData(false);
  };

  const handleExport = async () => {
    setIsExporting(true);
    toast({ title: "Iniciando Exportação", description: "Preparando os dados para backup. Isso pode levar alguns segundos..." });
    try {
      const data = await exportDatabase();
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const dateString = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
      link.download = `backup-donphone-${dateString}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({ title: "Exportação Concluída", description: "O arquivo de backup foi baixado." });
    } catch (error) {
      console.error("Backup failed:", error);
      toast({ title: "Erro na Exportação", description: error instanceof Error ? error.message : "Ocorreu um erro desconhecido.", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type === "application/json") {
        setImportFile(file);
        setIsImportAlertOpen(true); // Open confirmation dialog
      } else {
        toast({ title: "Arquivo Inválido", description: "Por favor, selecione um arquivo .json válido.", variant: "destructive" });
      }
    }
    // Reset file input to allow re-selection of the same file
    e.target.value = '';
  };

  const handleConfirmImport = async () => {
    if (!importFile) return;
    setIsImportAlertOpen(false);
    setIsImporting(true);
    toast({ title: "Iniciando Importação", description: "Restaurando os dados. Não feche esta janela." });

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const text = e.target?.result;
          if (typeof text !== 'string') {
            throw new Error("Falha ao ler o conteúdo do arquivo.");
          }
          const data = JSON.parse(text);
          await importDatabase(data);
          toast({ title: "Importação Concluída", description: "Os dados foram restaurados com sucesso. A página será recarregada." });
          // Invalidate all queries to force refetch after restore
          await queryClient.invalidateQueries();
          // Optional: full page reload
          setTimeout(() => window.location.reload(), 2000);
        } catch (error) {
          console.error("Import failed during file processing:", error);
          toast({ title: "Erro na Importação", description: error instanceof Error ? error.message : "Ocorreu um erro desconhecido ao processar o arquivo.", variant: "destructive" });
        } finally {
          setIsImporting(false);
          setImportFile(null);
        }
      };
      reader.onerror = () => {
         toast({ title: "Erro de Leitura", description: "Não foi possível ler o arquivo selecionado.", variant: "destructive" });
         setIsImporting(false);
         setImportFile(null);
      };
      reader.readAsText(importFile);
    } catch (error) {
      console.error("Import failed:", error);
      toast({ title: "Erro na Importação", description: error instanceof Error ? error.message : "Ocorreu um erro desconhecido.", variant: "destructive" });
      setIsImporting(false);
      setImportFile(null);
    }
  };

  const EstablishmentDataSkeleton = () => (
    <CardContent className="space-y-6">
       <div className="flex items-start gap-4">
        {/* Placeholder for where logo might have been, or adjust layout */}
        <Skeleton className="w-28 h-10 rounded-md" /> 
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <Separator />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        <div className="space-y-1.5"><Skeleton className="h-4 w-20" /><Skeleton className="h-5 w-40" /></div>
        <div className="space-y-1.5"><Skeleton className="h-4 w-20" /><Skeleton className="h-5 w-32" /></div>
        <div className="space-y-1.5"><Skeleton className="h-4 w-20" /><Skeleton className="h-5 w-48" /></div>
        <div className="space-y-1.5"><Skeleton className="h-4 w-20" /><Skeleton className="h-5 w-40" /></div>
      </div>
    </CardContent>
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-headline text-3xl font-semibold">Configurações</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Perfil do Usuário</CardTitle>
          <CardDescription>Gerencie suas informações pessoais. (Funcionalidade pendente)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">Nome</Label>
              <Input id="firstName" defaultValue="Admin" className="text-base" disabled />
            </div>
            <div>
              <Label htmlFor="lastName">Sobrenome</Label>
              <Input id="lastName" defaultValue="User" className="text-base" disabled />
            </div>
          </div>
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" defaultValue="admin@example.com" className="text-base" disabled />
          </div>
          <Button disabled>Salvar Perfil</Button>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building className="h-6 w-6 text-primary" />
            <CardTitle>
              {(!establishmentSettings && !isEditingEstablishmentData && !isLoadingSettings && !settingsError) 
                ? "Configurar Dados do Estabelecimento" 
                : "Dados do Estabelecimento"}
            </CardTitle>
          </div>
          <CardDescription>
            {(!establishmentSettings && !isEditingEstablishmentData && !isLoadingSettings && !settingsError)
              ? "Insira as informações da sua loja para começar."
              : "Gerencie as informações da sua loja. Estes dados aparecerão em comprovantes e O.S."}
          </CardDescription>
        </CardHeader>
        
        {isLoadingSettings ? (
            <EstablishmentDataSkeleton />
        ) : settingsError && !isEditingEstablishmentData ? ( 
           <CardContent className="pb-4">
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Erro ao Carregar Dados Salvos</AlertTitle>
              <AlertDescription>
                Não foi possível buscar os dados do estabelecimento: {settingsError.message}. 
                Você ainda pode preencher e salvar as informações abaixo.
                <Button onClick={() => refetchEstablishmentSettings()} variant="link" className="p-0 h-auto ml-1 text-destructive hover:text-destructive/80" disabled={isFetchingSettings}>
                  {isFetchingSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : "Tentar novamente"}
                </Button>
              </AlertDescription>
            </Alert>
          </CardContent>
        ) : null}
        
        {isEditingEstablishmentData || (!isLoadingSettings && !establishmentSettings) ? (
          <form onSubmit={handleSaveEstablishmentData}>
            <CardContent className="space-y-6 pt-0 sm:pt-6"> 
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <Label htmlFor="businessName">Nome do Estabelecimento</Label>
                  <Input id="businessName" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Nome da sua loja" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="businessCnpj">CNPJ</Label>
                  <Input id="businessCnpj" value={businessCnpj} onChange={(e) => setBusinessCnpj(e.target.value)} placeholder="00.000.000/0000-00" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="businessAddress">Endereço Completo</Label>
                <Input id="businessAddress" value={businessAddress} onChange={(e) => setBusinessAddress(e.target.value)} placeholder="Rua, Número, Bairro, Cidade - Estado, CEP" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <Label htmlFor="businessPhone">Telefone/WhatsApp</Label>
                  <Input id="businessPhone" value={businessPhone} onChange={(e) => setBusinessPhone(e.target.value)} placeholder="(00) 00000-0000" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="businessEmail">E-mail de Contato</Label>
                  <Input id="businessEmail" type="email" value={businessEmail} onChange={(e) => setBusinessEmail(e.target.value)} placeholder="contato@sualoja.com" />
                </div>
              </div>
              {/* Logo upload section removed */}
            </CardContent>
            <CardFooter className="border-t pt-6 flex flex-col sm:flex-row justify-end gap-2">
              {establishmentSettings && ( 
                <Button type="button" variant="outline" onClick={handleCancelEdit} className="w-full sm:w-auto" disabled={saveSettingsMutation.isPending || isFetchingSettings}>
                  Cancelar
                </Button>
              )}
              <Button type="submit" disabled={saveSettingsMutation.isPending || isFetchingSettings} className="w-full sm:w-auto">
                {(saveSettingsMutation.isPending || isFetchingSettings) ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {establishmentSettings ? "Salvar Alterações" : "Salvar Dados Iniciais"}
              </Button>
            </CardFooter>
          </form>
        ) : establishmentSettings ? (
          <>
            <CardContent className="space-y-6">
              {/* No logo display here */}
              <div className="mt-2 sm:mt-0">
                <h3 className="text-xl font-semibold">{businessName || <span className="text-muted-foreground italic">Nome não definido</span>}</h3>
                <p className="text-sm text-muted-foreground">{businessAddress || <span className="italic">Endereço não definido</span>}</p>
              </div>
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                <div><strong className="text-muted-foreground">CNPJ:</strong> {businessCnpj || <span className="italic">Não informado</span>}</div>
                <div><strong className="text-muted-foreground">Telefone:</strong> {businessPhone || <span className="italic">Não informado</span>}</div>
                <div className="md:col-span-2"><strong className="text-muted-foreground">Email:</strong> {businessEmail || <span className="italic">Não informado</span>}</div>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-6">
              <Button onClick={() => setIsEditingEstablishmentData(true)}>
                <Pencil className="mr-2 h-4 w-4" /> Editar Dados
              </Button>
            </CardFooter>
          </>
        ) : null }
      </Card>

      <Separator />

      <Card>
        <CardHeader>
           <div className="flex items-center gap-2">
            <DatabaseZap className="h-6 w-6 text-primary" />
            <CardTitle>Backup e Restauração</CardTitle>
          </div>
          <CardDescription>
            Exporte uma cópia de segurança de todos os seus dados ou importe um backup para restaurar o sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Atenção!</AlertTitle>
            <AlertDescription>
              A restauração de dados é uma ação destrutiva e <span className="font-semibold">substituirá todos os dados existentes no sistema</span> com os dados do arquivo de backup. Use com cautela.
            </AlertDescription>
          </Alert>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button onClick={handleExport} disabled={isExporting || isImporting} className="w-full sm:w-auto">
              {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Download className="mr-2 h-4 w-4" />}
              Exportar Dados (Backup)
            </Button>

            <Button asChild variant="outline" className="w-full sm:w-auto relative" disabled={isExporting || isImporting}>
                <Label>
                    {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Upload className="mr-2 h-4 w-4" />}
                    Importar Dados (Restaurar)
                    <Input 
                      type="file" 
                      className="sr-only" 
                      accept=".json" 
                      onChange={handleImportFileChange}
                      disabled={isImporting}
                    />
                </Label>
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={isImportAlertOpen} onOpenChange={setIsImportAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Importação de Dados?</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a restaurar o banco de dados com o arquivo <span className="font-bold">{importFile?.name}</span>.
              <br/><br/>
              <span className="font-bold text-destructive">Esta ação IRÁ APAGAR PERMANENTEMENTE todos os dados atuais</span> (clientes, produtos, vendas, OS, etc.) e substituí-los pelos dados do backup.
              <br/><br/>
              Tem certeza que deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setImportFile(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" 
              onClick={handleConfirmImport}>
              Sim, Apagar Tudo e Restaurar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
