
import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Truck, TruckFormData, TruckStatus } from "@/types/truck";
import { isValidBrazilianLicensePlate } from "@/lib/utils";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Schema de validação usando Zod
const truckFormSchema = z.object({
  name: z.string().min(3, {
    message: "Nome deve ter pelo menos 3 caracteres",
  }),
  driver_name: z.string().min(3, {
    message: "Nome do motorista deve ter pelo menos 3 caracteres",
  }),
  license_plate: z.string().refine(isValidBrazilianLicensePlate, {
    message: "Placa inválida. Use o formato AAA-1234 ou AAA1A23",
  }),
  capacity: z.number()
    .min(1000, { message: "Capacidade mínima é 1000L" })
    .max(100000, { message: "Capacidade máxima é 100000L" }),
  observations: z.string().optional(),
  status: z.enum(["active", "inactive", "maintenance"]),
});

interface TruckRegistrationFormProps {
  truck?: Truck;
  onSubmit: (data: TruckFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
  error?: string;
}

const TruckRegistrationForm = ({
  truck,
  onSubmit,
  onCancel,
  isSubmitting,
  error,
}: TruckRegistrationFormProps) => {
  const isEditing = !!truck;

  // Inicializar o formulário com os valores padrão ou do caminhão existente
  const form = useForm<z.infer<typeof truckFormSchema>>({
    resolver: zodResolver(truckFormSchema),
    defaultValues: {
      name: truck?.name || "",
      driver_name: truck?.driver_name || "",
      license_plate: truck?.license_plate || "",
      capacity: truck?.capacity || 5000,
      observations: truck?.observations || "",
      status: (truck?.status as TruckStatus) || "active",
    },
  });

  // Atualizar o formulário quando o caminhão mudar
  useEffect(() => {
    if (truck) {
      form.reset({
        name: truck.name,
        driver_name: truck.driver_name,
        license_plate: truck.license_plate,
        capacity: truck.capacity,
        observations: truck.observations || "",
        status: truck.status,
      });
    }
  }, [truck, form]);

  // Função para lidar com o envio do formulário
  const handleSubmit = async (data: z.infer<typeof truckFormSchema>) => {
    await onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome do Caminhão</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Caminhão 01" {...field} />
                </FormControl>
                <FormDescription>
                  Nome identificador do caminhão
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="driver_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Motorista Responsável</FormLabel>
                <FormControl>
                  <Input placeholder="Nome completo do motorista" {...field} />
                </FormControl>
                <FormDescription>
                  Nome do condutor principal
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="license_plate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Placa do Veículo</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="AAA-1234 ou AAA1A23" 
                    {...field} 
                    onChange={(e) => {
                      // Converter para maiúsculas automaticamente
                      field.onChange(e.target.value.toUpperCase());
                    }}
                  />
                </FormControl>
                <FormDescription>
                  Formato brasileiro (AAA-1234 ou AAA1A23)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="capacity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Capacidade (Litros)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="5000" 
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                    value={field.value}
                  />
                </FormControl>
                <FormDescription>
                  Entre 1.000L e 30.000L
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                    <SelectItem value="maintenance">Em Manutenção</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Estado atual do caminhão
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="observations"
            render={({ field }) => (
              <FormItem className="col-span-1 md:col-span-2">
                <FormLabel>Observações</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Informações adicionais sobre o caminhão..."
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Detalhes importantes sobre o veículo (opcional)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : isEditing ? "Atualizar" : "Cadastrar"}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default TruckRegistrationForm;
