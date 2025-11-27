<script setup lang="ts">
import { useGameLogic } from "../../composables/useGameLogic";

const {
  gameState,
  resetLevel,
  nextLevel,
  resetGame,
  goToMenu
} = useGameLogic();
</script>

<template>
  <div
    class="pointer-events-auto flex flex-col items-center justify-center w-full"
  >
    <div
      v-if="gameState === 'start'"
      class="bg-black/60 text-white p-6 rounded-xl text-center backdrop-blur-md"
    >
      <h1 class="text-4xl font-bold mb-4">Ready?</h1>
      <p class="text-xl">Pinch the ball to start!</p>
      <button
        @click="goToMenu"
        class="mt-4 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded text-sm"
      >
        Cancel
      </button>
    </div>

    <div
      v-if="gameState === 'lost'"
      class="bg-red-900/80 text-white p-8 rounded-xl text-center backdrop-blur-md border-2 border-red-500"
    >
      <h1 class="text-5xl font-bold mb-4">Game Over</h1>
      <p class="text-xl mb-6">You dropped the ball or hit a wall!</p>
      <div class="flex gap-4 justify-center">
        <button
          @click="resetLevel"
          class="bg-white text-red-900 px-8 py-3 rounded-full font-bold text-xl hover:scale-105 transition-transform cursor-pointer"
        >
          Try Again
        </button>
        <button
          @click="goToMenu"
          class="bg-black/40 text-white px-8 py-3 rounded-full font-bold text-xl hover:bg-black/60 transition-transform cursor-pointer"
        >
          Menu
        </button>
      </div>
    </div>

    <div
      v-if="gameState === 'level_complete'"
      class="bg-green-900/80 text-white p-8 rounded-xl text-center backdrop-blur-md border-2 border-green-500"
    >
      <h1 class="text-5xl font-bold mb-4">Level Complete!</h1>
      <div class="flex gap-4 justify-center">
        <button
          @click="nextLevel"
          class="bg-white text-green-900 px-8 py-3 rounded-full font-bold text-xl hover:scale-105 transition-transform cursor-pointer"
        >
          Next Level
        </button>
        <button
          @click="goToMenu"
          class="bg-black/40 text-white px-8 py-3 rounded-full font-bold text-xl hover:bg-black/60 transition-transform cursor-pointer"
        >
          Menu
        </button>
      </div>
    </div>

    <div
      v-if="gameState === 'won'"
      class="bg-yellow-600/80 text-white p-12 rounded-xl text-center backdrop-blur-md border-4 border-yellow-400"
    >
      <h1 class="text-6xl font-bold mb-6">VICTORY!</h1>
      <p class="text-2xl mb-8">You have mastered the maze!</p>
      <div class="flex gap-4 justify-center">
        <button
          @click="resetGame"
          class="bg-white text-yellow-900 px-8 py-3 rounded-full font-bold text-xl hover:scale-105 transition-transform cursor-pointer"
        >
          Play Again
        </button>
        <button
          @click="goToMenu"
          class="bg-black/40 text-white px-8 py-3 rounded-full font-bold text-xl hover:bg-black/60 transition-transform cursor-pointer"
        >
          Menu
        </button>
      </div>
    </div>
  </div>
</template>
