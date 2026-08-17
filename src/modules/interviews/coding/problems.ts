import type { CodingDifficulty } from "../schema";

export interface CodingProblem {
  id: string;
  title: string;
  topic: string;
  difficulty: CodingDifficulty;
  prompt: string;
  /** Kept out of the prompt so the interviewer can raise them if the candidate does not. */
  edgeCases: string[];
}

/** Topics follow the Guru taxonomy in docs/ROADMAP.md §5. */
export const CODING_PROBLEMS: CodingProblem[] = [
  {
    id: "two-sum",
    title: "Pair that sums to a target",
    topic: "Hash maps",
    difficulty: "easy",
    prompt:
      "Given an array of integers and a target, return the indices of the two numbers that add up to the target. Assume exactly one valid answer exists.",
    edgeCases: ["Duplicate values", "Negative numbers", "An empty array"],
  },
  {
    id: "valid-parentheses",
    title: "Balanced brackets",
    topic: "Stacks",
    difficulty: "easy",
    prompt:
      "Given a string containing only the characters ()[]{}, determine whether the brackets are correctly balanced and properly nested.",
    edgeCases: ["Empty string", "Closing bracket first", "Interleaved types"],
  },
  {
    id: "reverse-linked-list",
    title: "Reverse a linked list",
    topic: "Linked lists",
    difficulty: "easy",
    prompt:
      "Given the head of a singly linked list, reverse it and return the new head.",
    edgeCases: ["Empty list", "Single node", "Doing it in place"],
  },
  {
    id: "longest-unique-substring",
    title: "Longest substring without repeats",
    topic: "Sliding window",
    difficulty: "medium",
    prompt:
      "Given a string, return the length of the longest substring that contains no repeated characters.",
    edgeCases: ["All identical characters", "Empty string", "Unicode input"],
  },
  {
    id: "number-of-islands",
    title: "Number of islands",
    topic: "Graph traversal",
    difficulty: "medium",
    prompt:
      "Given a 2D grid of '1' (land) and '0' (water), return the number of islands. An island is connected horizontally or vertically.",
    edgeCases: ["Empty grid", "All water", "Mutating the input grid"],
  },
  {
    id: "group-anagrams",
    title: "Group anagrams",
    topic: "Hash maps",
    difficulty: "medium",
    prompt:
      "Given an array of strings, group the anagrams together. Return the groups in any order.",
    edgeCases: ["Empty strings", "Single-character words", "Sorting cost"],
  },
  {
    id: "search-rotated",
    title: "Search a rotated sorted array",
    topic: "Binary search",
    difficulty: "medium",
    prompt:
      "Given a sorted array that has been rotated at an unknown pivot, find the index of a target value in O(log n) time, or return -1.",
    edgeCases: ["No rotation", "Target at the pivot", "Duplicates"],
  },
  {
    id: "level-order",
    title: "Binary tree level order",
    topic: "Trees",
    difficulty: "medium",
    prompt:
      "Given the root of a binary tree, return its node values level by level, from left to right.",
    edgeCases: ["Null root", "Single node", "Highly unbalanced tree"],
  },
  {
    id: "coin-change",
    title: "Fewest coins for an amount",
    topic: "Dynamic programming",
    difficulty: "medium",
    prompt:
      "Given coin denominations and a target amount, return the fewest coins needed to make that amount, or -1 if it cannot be made.",
    edgeCases: ["Amount of zero", "Unreachable amount", "Very large amounts"],
  },
  {
    id: "word-ladder",
    title: "Shortest transformation sequence",
    topic: "Graph traversal",
    difficulty: "hard",
    prompt:
      "Given a start word, an end word, and a dictionary, return the length of the shortest transformation sequence changing one letter at a time, where every intermediate word is in the dictionary.",
    edgeCases: [
      "End word absent",
      "No valid path",
      "Cost of building the graph",
    ],
  },
  {
    id: "median-two-sorted",
    title: "Median of two sorted arrays",
    topic: "Binary search",
    difficulty: "hard",
    prompt:
      "Given two sorted arrays, return the median of the combined set in logarithmic time.",
    edgeCases: ["One array empty", "Odd vs even total length", "Overflow"],
  },
  {
    id: "lru-cache",
    title: "LRU cache",
    topic: "Design",
    difficulty: "hard",
    prompt:
      "Design a cache with a fixed capacity supporting get and put in O(1) average time, evicting the least recently used entry when full.",
    edgeCases: [
      "Capacity of one",
      "Updating an existing key",
      "Eviction order",
    ],
  },
];

export function selectProblem(
  difficulty: CodingDifficulty,
  seed = Math.random(),
): CodingProblem {
  const pool = CODING_PROBLEMS.filter(
    (problem) => problem.difficulty === difficulty,
  );
  const candidates = pool.length ? pool : CODING_PROBLEMS;
  return candidates[Math.floor(seed * candidates.length) % candidates.length]!;
}
