"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Recipe } from "@/types";
import { Play, Pause, RotateCcw, ChevronLeft, ChevronRight, CheckCircle, Timer } from "lucide-react";
import { triggerConfetti } from "@/lib/utils";
import { toast } from "sonner";

interface CookingModeModalProps {
  recipe: Recipe | null;
  isOpen: boolean;
  onClose: () => void;
}

export const CookingModeModal: React.FC<CookingModeModalProps> = ({
  recipe,
  isOpen,
  onClose,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  useEffect(() => {
    setCurrentStep(0);
    setTimerSeconds(0);
    setIsTimerRunning(false);
  }, [recipe, isOpen]);

  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            toast.success("⏰ Temporitzador completat!");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds]);

  if (!recipe) return null;

  const totalSteps = recipe.instructions.length;
  const isLastStep = currentStep === totalSteps - 1;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleFinishCooking = () => {
    triggerConfetti({
      particleCount: 80,
      spread: 80,
      origin: { y: 0.6 },
    });
    toast.success(`Plat completat amb èxit: ${recipe.title}! Bon profit!`);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="xl">
      <div className="space-y-6">
        {/* Top Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-500">
            <span className="uppercase tracking-wider">Pas {currentStep + 1} de {totalSteps}</span>
            <span className="text-primary-600 font-bold">{Math.round(((currentStep + 1) / totalSteps) * 100)}%</span>
          </div>
          <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Current Step Content */}
        <div className="p-6 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-200/80 dark:border-zinc-700/60 min-h-[160px] flex items-center justify-center text-center">
          <p className="text-lg sm:text-xl font-medium text-zinc-900 dark:text-zinc-100 leading-relaxed">
            {recipe.instructions[currentStep]}
          </p>
        </div>

        {/* Integrated Cooking Kitchen Timer */}
        <div className="p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600">
              <Timer className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-zinc-400 block font-medium">Temporitzador de Cuina</span>
              <span className="text-xl font-mono font-bold text-zinc-900 dark:text-zinc-100">
                {formatTime(timerSeconds)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setTimerSeconds((prev) => prev + 60)}
              className="px-2.5 py-1 text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 rounded-lg text-zinc-700 dark:text-zinc-300 transition"
            >
              +1 min
            </button>
            <button
              onClick={() => setTimerSeconds((prev) => prev + 300)}
              className="px-2.5 py-1 text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 rounded-lg text-zinc-700 dark:text-zinc-300 transition"
            >
              +5 min
            </button>
            <button
              onClick={() => setIsTimerRunning(!isTimerRunning)}
              disabled={timerSeconds === 0}
              className={`p-2 rounded-lg transition ${
                isTimerRunning
                  ? "bg-amber-500 text-white"
                  : "bg-emerald-600 text-white disabled:opacity-40"
              }`}
            >
              {isTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button
              onClick={() => {
                setIsTimerRunning(false);
                setTimerSeconds(0);
              }}
              className="p-2 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 transition"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Step Navigation Controls */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <Button
            variant="outline"
            onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="w-4 h-4" />
            Pas Anterior
          </Button>

          {isLastStep ? (
            <Button variant="primary" onClick={handleFinishCooking} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <CheckCircle className="w-4 h-4" />
              Completa Recepta
            </Button>
          ) : (
            <Button variant="primary" onClick={() => setCurrentStep((prev) => Math.min(totalSteps - 1, prev + 1))}>
              Pas Següent
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};
