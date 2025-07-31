
"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { BrainCircuit, Loader2, WandSparkles } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { suggestRepairSolutions, type SuggestRepairSolutionsOutput } from '@/ai/flows/suggest-repair-solutions';

export default function AiDiagnosticsPage() {
  const [phoneModel, setPhoneModel] = useState('');
  const [problemDescription, setProblemDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SuggestRepairSolutionsOutput | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneModel || !problemDescription) {
      setError("Por favor, preencha o modelo do aparelho e a descrição do problema.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await suggestRepairSolutions({ phoneModel, problemDescription });
      setResult(response);
    } catch (err: any) {
      console.error("AI Diagnostic Error:", err);
      setError(err.message || "Ocorreu um erro ao consultar a IA. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewDiagnosis = () => {
    setPhoneModel('');
    setProblemDescription('');
    setResult(null);
    setError(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-headline text-3xl font-semibold text-accent">Diagnóstico com IA</h1>
        {result && (
          <Button onClick={handleNewDiagnosis}>
            <WandSparkles className="mr-2 h-4 w-4" />
            Nova Análise
          </Button>
        )}
      </div>

      <Card className="mx-auto w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BrainCircuit className="h-6 w-6 text-primary" />
            Assistente de Reparo Inteligente
          </CardTitle>
          <CardDescription>
            Descreva o problema do aparelho para receber sugestões de diagnóstico, peças necessárias e tempo estimado de reparo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!result ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="phoneModel">Modelo do Aparelho</Label>
                <Input
                  id="phoneModel"
                  placeholder="Ex: iPhone 13 Pro"
                  value={phoneModel}
                  onChange={(e) => setPhoneModel(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="problemDescription">Descrição do Problema</Label>
                <Textarea
                  id="problemDescription"
                  placeholder="Ex: Tela não liga, mas o aparelho vibra ao conectar o carregador."
                  value={problemDescription}
                  onChange={(e) => setProblemDescription(e.target.value)}
                  rows={4}
                  disabled={isLoading}
                />
              </div>
              
              {error && (
                <Alert variant="destructive">
                  <AlertTitle>Erro na Análise</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? 'Analisando...' : 'Obter Diagnóstico'}
              </Button>
            </form>
          ) : (
            <div className="space-y-6 animate-in fade-in-50 duration-500">
              <div>
                <h3 className="font-semibold text-lg text-foreground mb-2">Resultados para: <span className="text-primary font-bold">{phoneModel}</span></h3>
                 <p className="text-sm text-muted-foreground border-l-2 border-border pl-3 italic">"{problemDescription}"</p>
              </div>

              {result.suggestedSolutions && result.suggestedSolutions.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-foreground">Soluções Sugeridas</h4>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    {result.suggestedSolutions.map((solution, index) => (
                      <li key={index}>{solution}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {result.partsNeeded && result.partsNeeded.length > 0 && (
                 <div className="space-y-2">
                  <h4 className="font-semibold text-foreground">Peças Potencialmente Necessárias</h4>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    {result.partsNeeded.map((part, index) => (
                      <li key={index}>{part}</li>
                    ))}
                  </ul>
                </div>
              )}

              {result.estimatedRepairTime && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-foreground">Tempo Estimado de Reparo</h4>
                  <p className="text-muted-foreground">{result.estimatedRepairTime}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
