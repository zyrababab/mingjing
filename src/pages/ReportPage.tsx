import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import type { EngineOutput } from '@/engine/engine';
import { buildReport, downloadReport } from '@/engine/report';

export default function ReportPage({ engine }: { engine: EngineOutput }) {
  const md = buildReport(engine);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">审计报告</h1>
        <p className="text-muted-foreground mt-1">
          汇总偏见画像、幻觉检测与治理建议，一键导出《大模型偏见审计报告》
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>报告预览</CardTitle>
            <CardDescription>Markdown 格式，可直接提交或转为 PDF</CardDescription>
          </div>
          <Button onClick={() => downloadReport(engine)} className="bg-indigo-600 hover:bg-indigo-700">
            <Download className="mr-2 h-4 w-4" /> 下载报告
          </Button>
        </CardHeader>
        <CardContent>
          <pre className="whitespace-pre-wrap text-sm bg-muted p-6 rounded-lg leading-relaxed max-h-[600px] overflow-y-auto">
            {md}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
