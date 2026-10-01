import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dna, Wand2 } from 'lucide-react';
import DebiasLab from '@/pages/DebiasLab';
import EvolveLab from '@/pages/EvolveLab';

/** 去偏进化实验室：去偏工作台（策略对比干预）+ 进化实验室（自进化探针）双合一 */
export default function DebiasEvolveLab() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">去偏进化实验室</h1>
        <p className="text-muted-foreground mt-1">
          两大去偏利器合一：去偏工作台对比三种干预策略的即时效果；进化实验室让探针自我进化、持续挖掘模型盲区——治标与治本并重
        </p>
      </div>

      <Tabs defaultValue="debias">
        <TabsList>
          <TabsTrigger value="debias" className="flex items-center gap-1.5">
            <Wand2 className="h-3.5 w-3.5" />去偏工作台
          </TabsTrigger>
          <TabsTrigger value="evolve" className="flex items-center gap-1.5">
            <Dna className="h-3.5 w-3.5" />进化实验室
          </TabsTrigger>
        </TabsList>
        <TabsContent value="debias" className="pt-4"><DebiasLab /></TabsContent>
        <TabsContent value="evolve" className="pt-4"><EvolveLab /></TabsContent>
      </Tabs>
    </div>
  );
}
