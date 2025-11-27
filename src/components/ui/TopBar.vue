<script setup lang="ts">
import { useGameLogic } from "../../composables/useGameLogic";

const { goToMenu, currentLevel } = useGameLogic();
</script>

<template>
  <div class="flex justify-between items-start pointer-events-auto">
    <div class="bg-black/50 text-white p-4 rounded backdrop-blur-sm">
      <div class="flex gap-4 items-center mb-2">
        <button
          @click="goToMenu"
          class="bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded text-sm cursor-pointer pointer-events-auto"
        >
          Menu
        </button>
        <h2 class="text-2xl font-bold" v-if="currentLevel">{{ currentLevel.name }}</h2>
      </div>
      <p v-if="currentLevel">Level: {{ currentLevel.id }}</p>
      <p class="text-sm opacity-75 mt-2">
        Instructions: Pinch to grab the ball. Drag to green zone. Don't touch blue walls.
      </p>
    </div>
    <slot name="loading"></slot>
  </div>
</template>

