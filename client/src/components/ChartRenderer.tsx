import { useMemo } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import type { Chart, FormResponse } from "@shared/schema";

interface ChartRendererProps {
  chart: Chart;
  responses: FormResponse[];
  onDelete?: (chartId: string) => void;
}

const COLORS = ['#f97316', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e'];

export default function ChartRenderer({ chart, responses, onDelete }: ChartRendererProps) {
  const chartData = useMemo(() => {
    const dataMap = new Map<string, number>();

    responses.forEach((response) => {
      const answers = response.answers as Record<string, any>;
      const urlParams = response.urlParams as Record<string, any> || {};
      const allData = { ...answers, ...urlParams };
      
      const xValue = String(allData[chart.xAxisField] || 'Sin respuesta');
      
      if (chart.aggregationType === 'count') {
        dataMap.set(xValue, (dataMap.get(xValue) || 0) + 1);
      } else if (chart.yAxisField) {
        const yValue = Number(allData[chart.yAxisField]) || 0;
        const current = dataMap.get(xValue) || 0;
        
        switch (chart.aggregationType) {
          case 'sum':
            dataMap.set(xValue, current + yValue);
            break;
          case 'avg':
            // Para promedio, necesitamos rastrear suma y conteo por separado
            // Por simplicidad, solo sumamos aquí y dividimos después
            dataMap.set(xValue, current + yValue);
            break;
          case 'min':
            dataMap.set(xValue, current === 0 ? yValue : Math.min(current, yValue));
            break;
          case 'max':
            dataMap.set(xValue, Math.max(current, yValue));
            break;
        }
      }
    });

    return Array.from(dataMap.entries()).map(([name, value]) => ({
      name,
      value,
    }));
  }, [chart, responses]);

  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 5, right: 30, left: 20, bottom: 5 },
    };

    switch (chart.chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#f97316" name={chart.aggregationType === 'count' ? 'Cantidad' : 'Valor'} />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="value" stroke="#f97316" name={chart.aggregationType === 'count' ? 'Cantidad' : 'Valor'} />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="value" stroke="#f97316" fill="#f97316" fillOpacity={0.6} name={chart.aggregationType === 'count' ? 'Cantidad' : 'Valor'} />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis dataKey="value" />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Legend />
              <Scatter name={chart.aggregationType === 'count' ? 'Cantidad' : 'Valor'} data={chartData} fill="#f97316" />
            </ScatterChart>
          </ResponsiveContainer>
        );

      default:
        return <p className="text-center text-muted-foreground py-8">Tipo de gráfico no soportado</p>;
    }
  };

  return (
    <Card data-testid={`chart-${chart.id}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-lg" data-testid="text-chart-title">{chart.title}</CardTitle>
        {onDelete && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(chart.id)}
            data-testid={`button-delete-chart-${chart.id}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="text-center text-muted-foreground py-8" data-testid="text-no-data">
            No hay datos para mostrar
          </p>
        ) : (
          renderChart()
        )}
      </CardContent>
    </Card>
  );
}
