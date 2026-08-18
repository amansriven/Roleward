/**
 * Archetypes are not questions. Each one describes a skill to test and the
 * constraints a generated problem must satisfy to test it honestly.
 *
 * Storing ~30 of these instead of ~500 problems is the whole point: variation
 * comes from generation, so a candidate never memorizes their way through.
 */

export const CODING_SKILLS = [
  "pattern_recognition",
  "brute_force_articulation",
  "optimization_derivation",
  "edge_case_identification",
  "implementation_accuracy",
  "complexity_analysis",
  "communication",
] as const;
export type CodingSkill = (typeof CODING_SKILLS)[number];

export const CODING_SKILL_LABELS: Record<CodingSkill, string> = {
  pattern_recognition: "Recognizing the pattern",
  brute_force_articulation: "Explaining the brute force",
  optimization_derivation: "Deriving the optimization",
  edge_case_identification: "Edge-case identification",
  implementation_accuracy: "Implementation accuracy",
  complexity_analysis: "Complexity analysis",
  communication: "Communication",
};

export type Difficulty = "easy" | "medium" | "hard";

export interface Archetype {
  id: string;
  name: string;
  /** Shown to the candidate only after they commit to a classification. */
  tell: string;
  competencies: string[];
  /** Free-form guidance handed to the generator. */
  constraints: string[];
  /**
   * Techniques that would make this a different archetype. Live testing showed
   * the model drifting - a "two pointers" request came back as a monotonic
   * deque problem - which would teach the wrong pattern name at the
   * classification gate.
   */
  exclusions: string[];
  optimalComplexity: Record<Difficulty, string>;
  bruteForceComplexity: string;
  /** Distractors for the classify-before-you-code gate. */
  confusableWith: string[];
}

export const ARCHETYPES: Archetype[] = [
  {
    id: "sliding-window",
    name: "Sliding window",
    tell: "You are asked about a contiguous run of elements, and recomputing each run from scratch repeats work the previous run already did.",
    competencies: [
      "recognizing contiguous-range structure",
      "maintaining incremental state across a moving boundary",
      "deciding when to expand versus shrink",
      "arguing the amortized O(n) bound",
    ],
    constraints: [
      "The optimal solution must maintain a window over a single pass.",
      "A correct brute force must re-scan every candidate range.",
      "Include at least one case where the window must shrink, not only grow.",
      "Avoid problems solvable by a single prefix sum lookup.",
    ],
    exclusions: [
      "Must NOT require a deque, monotonic structure, heap, or sorted container to track the window.",
      "Window state must be a simple counter, sum, or frequency map.",
      "If tracking a running min and max is required, it is not this archetype.",
    ],
    optimalComplexity: { easy: "O(n)", medium: "O(n)", hard: "O(n log n)" },
    bruteForceComplexity: "O(n^2)",
    confusableWith: ["two-pointers", "prefix-sum", "hash-map"],
  },
  {
    id: "hash-map",
    name: "Hash map",
    tell: "You need to answer 'have I seen this before?' or 'how many of these are there?' while scanning, and a nested loop is doing that lookup by rescanning.",
    competencies: [
      "replacing a nested scan with a keyed lookup",
      "choosing a key that makes the invariant obvious",
      "handling duplicate and absent keys",
      "trading space for time deliberately",
    ],
    constraints: [
      "The optimal solution must reduce a nested scan to one pass plus a map.",
      "The key must require a small insight, not merely be the element itself.",
      "Include a case with duplicate values that a naive key choice mishandles.",
      "Do not require sorting in the optimal path.",
    ],
    exclusions: [
      "Must NOT be about a contiguous range or window.",
      "Must NOT depend on two indices converging over sorted data.",
    ],
    optimalComplexity: { easy: "O(n)", medium: "O(n)", hard: "O(n)" },
    bruteForceComplexity: "O(n^2)",
    confusableWith: ["two-pointers", "sliding-window", "sorting-invariant"],
  },
  {
    id: "two-pointers",
    name: "Two pointers",
    tell: "The input is sorted or can be, and the answer depends on a pair or a partition whose search space collapses when you move one end at a time.",
    competencies: [
      "exploiting order to discard half the search space",
      "choosing which pointer to advance and justifying it",
      "avoiding the off-by-one at the crossing point",
      "recognizing when sorting first is worth the log factor",
    ],
    constraints: [
      "The optimal solution must use two indices converging or advancing in step.",
      "The correctness argument must depend on ordering.",
      "Include a case where both pointers land on equal values.",
      "Do not make the answer reachable by a single linear scan.",
    ],
    exclusions: [
      "Must NOT require a deque, heap, or monotonic structure.",
      "Must NOT be a contiguous-window problem whose state is a frequency map.",
      "Correctness must rest on ordering and converging indices, not on keyed lookup.",
    ],
    optimalComplexity: {
      easy: "O(n)",
      medium: "O(n)",
      hard: "O(n log n)",
    },
    bruteForceComplexity: "O(n^2)",
    confusableWith: ["sliding-window", "binary-search", "hash-map"],
  },
  {
    id: "binary-search",
    name: "Binary search",
    tell: "The search space is already ordered, and looking at the middle tells you which half can be discarded outright.",
    competencies: [
      "identifying the monotone property that makes halving valid",
      "stating the loop invariant before writing the loop",
      "handling duplicates at the boundary",
      "terminating without an off-by-one",
    ],
    constraints: [
      "The optimal solution must halve the range each step over a sorted array.",
      "A correct brute force must scan linearly.",
      "Include a case where the target is absent and one where it repeats.",
      "The array must be sorted by the problem statement, not sorted by the solution.",
    ],
    exclusions: [
      "Must NOT search over a range of candidate answers rather than over indices.",
      "Must NOT depend on two pointers converging from both ends to form a pair.",
    ],
    optimalComplexity: {
      easy: "O(log n)",
      medium: "O(log n)",
      hard: "O(n log n)",
    },
    bruteForceComplexity: "O(n)",
    confusableWith: [
      "binary-search-on-answer",
      "two-pointers",
      "sorting-invariant",
    ],
  },
  {
    id: "binary-search-on-answer",
    name: "Binary search on the answer",
    tell: "You are asked for the smallest or largest value that still works, and checking whether one specific value works is much easier than finding the best one.",
    competencies: [
      "spotting that feasibility is monotone in the answer",
      "writing the feasibility check as a separate function",
      "bounding the candidate range correctly",
      "keeping the check independent of the search",
    ],
    constraints: [
      "The answer must be an integer inside a range the constraints bound.",
      "Feasibility must be checkable in one linear pass and must be monotone.",
      "A correct brute force must try every candidate value in order.",
      "Include a case where the answer is the lowest or highest legal value.",
    ],
    exclusions: [
      "Must NOT be a search for an index or element inside a sorted array.",
      "Must NOT need a table of subproblem results to decide feasibility.",
    ],
    optimalComplexity: {
      easy: "O(n log C)",
      medium: "O(n log C)",
      hard: "O(n log C)",
    },
    bruteForceComplexity: "O(n * C)",
    confusableWith: ["binary-search", "greedy-exchange", "dp-1d"],
  },
  {
    id: "prefix-sum",
    name: "Prefix sums",
    tell: "The same static array is queried over many ranges, and each query re-adds numbers an earlier query already added.",
    competencies: [
      "precomputing cumulative state once",
      "expressing a range answer as a difference of two prefixes",
      "getting the inclusive and exclusive boundaries right",
      "extending the idea past plain sums",
    ],
    constraints: [
      "The optimal solution must precompute cumulative values in one pass.",
      "Queries arrive as an int[][] of index pairs, since the signature has no object types.",
      "A correct brute force must re-add each range element by element.",
      "Include negative values so a running-total shortcut cannot be assumed.",
    ],
    exclusions: [
      "Must NOT be a window that expands and shrinks under a condition.",
      "Must NOT apply updates to ranges; the array is read-only.",
    ],
    optimalComplexity: {
      easy: "O(n + q)",
      medium: "O(n + q)",
      hard: "O(n + q)",
    },
    bruteForceComplexity: "O(n * q)",
    confusableWith: ["sliding-window", "difference-array", "hash-map"],
  },
  {
    id: "difference-array",
    name: "Difference array",
    tell: "Ranges are updated over and over, and only the state after all the updates matters.",
    competencies: [
      "recording a range update as two endpoint marks",
      "recovering the final array with one cumulative pass",
      "handling updates that overlap or touch",
      "seeing why order of application stops mattering",
    ],
    constraints: [
      "Updates arrive as an int[][] where each row is a start, an end, and a delta.",
      "The optimal solution must apply each update in constant time.",
      "A correct brute force must walk every index of every range.",
      "Include overlapping ranges and a range covering the whole array.",
    ],
    exclusions: [
      "Must NOT ask range questions about a static array.",
      "Must NOT require queries interleaved between updates.",
    ],
    optimalComplexity: {
      easy: "O(n + q)",
      medium: "O(n + q)",
      hard: "O(n + q)",
    },
    bruteForceComplexity: "O(n * q)",
    confusableWith: ["prefix-sum", "interval-merging", "sorting-invariant"],
  },
  {
    id: "sorting-invariant",
    name: "Sort to expose the invariant",
    tell: "The input looks unordered and the question looks quadratic, but once sorted a single pass makes the answer obvious.",
    competencies: [
      "recognizing that order is the missing structure",
      "choosing the sort key deliberately",
      "arguing why the sorted pass is sufficient",
      "accepting the log factor as the price of simplicity",
    ],
    constraints: [
      "The optimal solution must sort first and then finish in one linear pass.",
      "The sort key must require a small choice, not merely be the value.",
      "A correct brute force must compare every pair.",
      "Include ties on the sort key that a careless comparator mishandles.",
    ],
    exclusions: [
      "Must NOT depend on two indices converging as the central idea.",
      "Must NOT need a heap or any structure maintained during the pass.",
    ],
    optimalComplexity: {
      easy: "O(n log n)",
      medium: "O(n log n)",
      hard: "O(n log n)",
    },
    bruteForceComplexity: "O(n^2)",
    confusableWith: ["two-pointers", "greedy-exchange", "interval-merging"],
  },
  {
    id: "interval-merging",
    name: "Interval overlap",
    tell: "You are given ranges that may overlap, and the answer depends on which ones touch each other.",
    competencies: [
      "sorting intervals by the endpoint that matters",
      "deciding what counts as an overlap at the boundary",
      "carrying a merged range forward across a scan",
      "handling intervals fully contained in others",
    ],
    constraints: [
      "Intervals arrive as an int[][] where each row is a start and an end.",
      "The optimal solution must sort once and then sweep in one pass.",
      "A correct brute force must compare every pair of intervals.",
      "Include touching intervals, nested intervals, and a single-point interval.",
      "If the result is a set of intervals it must be returned sorted by start.",
    ],
    exclusions: [
      "Must NOT be a weighted selection needing a table of subproblem results.",
      "Must NOT be about applying deltas to a range and reading the final array.",
    ],
    optimalComplexity: {
      easy: "O(n log n)",
      medium: "O(n log n)",
      hard: "O(n log n)",
    },
    bruteForceComplexity: "O(n^2)",
    confusableWith: [
      "sorting-invariant",
      "greedy-exchange",
      "difference-array",
    ],
  },
  {
    id: "greedy-exchange",
    name: "Greedy with an exchange argument",
    tell: "A locally best choice turns out to be safe, and the real work is arguing why taking it never costs you the optimum.",
    competencies: [
      "identifying the choice that is provably safe",
      "making the exchange argument out loud",
      "recognizing when greed fails and a table is required",
      "ordering the input so the greedy choice is available",
    ],
    constraints: [
      "The optimal solution must commit to each choice without revisiting it.",
      "A correct brute force must enumerate subsets or orderings.",
      "Include a case where the obvious but wrong greedy rule fails.",
      "The safe choice must need justification, not be self-evident.",
    ],
    exclusions: [
      "Must NOT require memoizing overlapping subproblems.",
      "Must NOT be primarily about merging overlapping ranges.",
    ],
    optimalComplexity: {
      easy: "O(n log n)",
      medium: "O(n log n)",
      hard: "O(n log n)",
    },
    bruteForceComplexity: "O(2^n)",
    confusableWith: ["sorting-invariant", "dp-1d", "interval-merging"],
  },
  {
    id: "heap-top-k",
    name: "Heap for the top k",
    tell: "You need the best few of something, and sorting everything does far more work than the question actually asked for.",
    competencies: [
      "keeping only what can still matter",
      "choosing a min heap or a max heap and saying why",
      "arguing the O(n log k) bound against a full sort",
      "handling k larger than the input",
    ],
    constraints: [
      "The optimal solution must maintain a bounded heap of size k.",
      "A correct brute force must sort everything or rescan for each of the k picks.",
      "Include k equal to one and k equal to the input length.",
      "The result must be returned in a sorted order the statement specifies.",
    ],
    exclusions: [
      "Must NOT be a maximum over a sliding window of fixed size.",
      "Must NOT be solvable by sorting once and reading a slice.",
    ],
    optimalComplexity: {
      easy: "O(n log k)",
      medium: "O(n log k)",
      hard: "O(n log k)",
    },
    bruteForceComplexity: "O(n^2)",
    confusableWith: ["sorting-invariant", "monotonic-deque", "dijkstra"],
  },
  {
    id: "monotonic-stack",
    name: "Monotonic stack",
    tell: "For each element you need the next or previous one that beats it, and the naive scan keeps re-walking the same neighbours.",
    competencies: [
      "seeing that a dominated element can never be an answer again",
      "keeping the stack ordered as an invariant",
      "arguing amortized O(n) despite the inner loop",
      "handling elements with no answer at all",
    ],
    constraints: [
      "The optimal solution must push and pop each element at most once.",
      "A correct brute force must scan forward or backward from each index.",
      "Include a strictly increasing input and a strictly decreasing one.",
      "Include equal neighbouring values so the comparison strictness matters.",
    ],
    exclusions: [
      "Must NOT be a maximum over a fixed-size window.",
      "Must NOT be about matching nested opening and closing symbols.",
    ],
    optimalComplexity: { easy: "O(n)", medium: "O(n)", hard: "O(n)" },
    bruteForceComplexity: "O(n^2)",
    confusableWith: ["monotonic-deque", "stack-matching", "two-pointers"],
  },
  {
    id: "monotonic-deque",
    name: "Monotonic deque",
    tell: "A window slides and you need its maximum or minimum, and a plain counter cannot undo the element that just fell out of the window.",
    competencies: [
      "seeing why a sum can be subtracted but an extreme cannot",
      "discarding dominated elements as they arrive",
      "evicting from the front once an index leaves the window",
      "arguing amortized O(n) for a structure touched twice per element",
    ],
    constraints: [
      "The window size must be a parameter of the signature.",
      "The optimal solution must maintain an ordered deque of indices.",
      "A correct brute force must rescan each window from scratch.",
      "Include a window size of one and a window covering the whole array.",
    ],
    exclusions: [
      "Must NOT be answerable with a running sum or frequency map alone.",
      "Must NOT be a next-greater-element question over the whole array.",
    ],
    optimalComplexity: { easy: "O(n)", medium: "O(n)", hard: "O(n)" },
    bruteForceComplexity: "O(n * k)",
    confusableWith: ["sliding-window", "monotonic-stack", "heap-top-k"],
  },
  {
    id: "stack-matching",
    name: "Nesting with a stack",
    tell: "The structure nests, and every decision depends on the most recent thing that has not been closed yet.",
    competencies: [
      "recognizing last-in-first-out structure in the problem",
      "deciding what to push and what to compare on pop",
      "detecting unbalanced input in both directions",
      "keeping depth and content separate",
    ],
    constraints: [
      "Input is a string or a string[] whose validity depends on nesting.",
      "The optimal solution must be a single pass over one stack.",
      "A correct brute force must repeatedly collapse matched pairs and rescan.",
      "Include unbalanced input that fails early and input that fails only at the end.",
    ],
    exclusions: [
      "Must NOT be a next-greater or previous-greater question.",
      "Must NOT require evaluating arithmetic or a full grammar.",
    ],
    optimalComplexity: { easy: "O(n)", medium: "O(n)", hard: "O(n)" },
    bruteForceComplexity: "O(n^2)",
    confusableWith: ["monotonic-stack", "string-parsing", "backtracking"],
  },
  {
    id: "dp-1d",
    name: "Linear dynamic programming",
    tell: "The best answer at each position is built from a couple of earlier positions, and the plain recursion keeps re-solving the same positions.",
    competencies: [
      "defining the state in one sentence",
      "writing the recurrence and its base case",
      "identifying the overlap that makes memoization pay",
      "reducing the table to a few rolling variables",
    ],
    constraints: [
      "The state must be a single index over one sequence.",
      "The optimal solution must fill a one-dimensional table in order.",
      "A correct brute force must explore choices recursively without memoizing.",
      "Include a case where the greedy choice at each step is wrong.",
    ],
    exclusions: [
      "Must NOT need a second dimension for a budget, a capacity, or a second sequence.",
      "Must NOT be solvable by a safe local choice at every step.",
    ],
    optimalComplexity: { easy: "O(n)", medium: "O(n)", hard: "O(n)" },
    bruteForceComplexity: "O(2^n)",
    confusableWith: ["greedy-exchange", "dp-knapsack", "dp-subsequence"],
  },
  {
    id: "dp-grid",
    name: "Grid dynamic programming",
    tell: "You move through a grid one step at a time, and every path recomputes cells that earlier paths already costed.",
    competencies: [
      "defining state as a cell rather than a path",
      "getting the traversal order to respect dependencies",
      "handling blocked cells and edges",
      "collapsing the table to a single row",
    ],
    constraints: [
      "The grid arrives as an int[][] or string[][], since there are no object types.",
      "Movement must be restricted so the dependency order is acyclic.",
      "A correct brute force must enumerate paths recursively.",
      "Include a grid with a single row and one that is entirely blocked.",
    ],
    exclusions: [
      "Must NOT allow movement in every direction, which would need a real shortest-path search.",
      "Must NOT be about counting or measuring connected regions.",
    ],
    optimalComplexity: {
      easy: "O(m * n)",
      medium: "O(m * n)",
      hard: "O(m * n)",
    },
    bruteForceComplexity: "O(2^(m + n))",
    confusableWith: ["dp-1d", "flood-fill", "graph-bfs"],
  },
  {
    id: "dp-subsequence",
    name: "Two-sequence dynamic programming",
    tell: "Two sequences are compared, and the answer keeps or drops elements without ever reordering them.",
    competencies: [
      "indexing state by a position in each sequence",
      "separating the match case from the skip cases",
      "keeping subsequence and substring apart",
      "reconstructing an answer from the table when asked",
    ],
    constraints: [
      "The state must be a pair of indices, one into each sequence.",
      "A correct brute force must try every subsequence of one side.",
      "Include sequences with no common elements and identical sequences.",
      "Element order must be preserved; the problem must not permit reordering.",
    ],
    exclusions: [
      "Must NOT require the kept elements to be contiguous.",
      "Must NOT reduce to a single-sequence linear table.",
    ],
    optimalComplexity: {
      easy: "O(n * m)",
      medium: "O(n * m)",
      hard: "O(n * m)",
    },
    bruteForceComplexity: "O(2^n)",
    confusableWith: ["dp-1d", "dp-interval", "sliding-window"],
  },
  {
    id: "dp-knapsack",
    name: "Subset choice under a budget",
    tell: "You pick a subset subject to a limit, and different subsets keep arriving at the very same remaining budget.",
    competencies: [
      "adding the budget as a second state dimension",
      "distinguishing take from skip cleanly",
      "recognizing that a ratio-greedy rule is unsafe here",
      "bounding the table by the constraints",
    ],
    constraints: [
      "The budget or capacity must be an int parameter with a small stated bound.",
      "The optimal solution must fill a table indexed by item and remaining budget.",
      "A correct brute force must enumerate every subset.",
      "Include a case where the greedy by value-to-weight ratio is wrong.",
    ],
    exclusions: [
      "Must NOT be solvable by sorting and taking items in order.",
      "Must NOT need a bitmask over items to express the state.",
    ],
    optimalComplexity: {
      easy: "O(n * W)",
      medium: "O(n * W)",
      hard: "O(n * W)",
    },
    bruteForceComplexity: "O(2^n)",
    confusableWith: ["dp-1d", "greedy-exchange", "dp-bitmask"],
  },
  {
    id: "dp-interval",
    name: "Interval dynamic programming",
    tell: "The answer for a stretch of the input depends on where you split it, and every split re-solves the same inner stretches.",
    competencies: [
      "defining state as a range rather than a position",
      "iterating by increasing range length",
      "choosing the split point as the inner loop",
      "identifying the base case of a length-one range",
    ],
    constraints: [
      "The state must be a pair of endpoints over one sequence.",
      "Input length must stay at or below 40 so the cubic solution runs quickly.",
      "A correct brute force must try every split recursively without memoizing.",
      "Include a range where the best split is neither end.",
    ],
    exclusions: [
      "Must NOT be expressible as a single index scanned left to right.",
      "Must NOT compare two separate sequences.",
    ],
    optimalComplexity: {
      easy: "O(n^3)",
      medium: "O(n^3)",
      hard: "O(n^3)",
    },
    bruteForceComplexity: "O(2^n)",
    confusableWith: ["dp-subsequence", "dp-1d", "backtracking"],
  },
  {
    id: "dp-bitmask",
    name: "Bitmask over subsets",
    tell: "The input is suspiciously small, and the thing you need to remember is exactly which items you have already used.",
    competencies: [
      "noticing that a tiny n licenses an exponential state",
      "encoding a subset as an integer",
      "iterating masks in an order that respects dependencies",
      "bounding the work at 2^n times n",
    ],
    constraints: [
      "The number of items must be bounded at 15 or fewer by the constraints.",
      "The state must include a subset of used items.",
      "A correct brute force must enumerate permutations.",
      "Include the empty subset and the full subset as reachable states.",
    ],
    exclusions: [
      "Must NOT be solvable with a polynomial table over indices.",
      "Must NOT be about bitwise identities on the input values themselves.",
    ],
    optimalComplexity: {
      easy: "O(2^n * n)",
      medium: "O(2^n * n)",
      hard: "O(2^n * n^2)",
    },
    bruteForceComplexity: "O(n!)",
    confusableWith: ["backtracking", "dp-knapsack", "bit-manipulation"],
  },
  {
    id: "graph-bfs",
    name: "Breadth-first shortest path",
    tell: "Every move costs the same, and you are asked for the fewest moves rather than the cheapest route.",
    competencies: [
      "recognizing uniform cost as the licence for a queue",
      "marking nodes visited on enqueue rather than on dequeue",
      "tracking distance by level",
      "handling unreachable nodes",
    ],
    constraints: [
      "The graph arrives as an int node count plus an int[][] edge list, since there are no object types.",
      "All moves must cost exactly the same.",
      "A correct brute force must enumerate paths recursively.",
      "Include a disconnected node and a graph with a cycle.",
    ],
    exclusions: [
      "Must NOT give edges different weights.",
      "Must NOT ask only whether two nodes are connected.",
    ],
    optimalComplexity: {
      easy: "O(V + E)",
      medium: "O(V + E)",
      hard: "O(V + E)",
    },
    bruteForceComplexity: "O(2^V)",
    confusableWith: ["dijkstra", "graph-components", "flood-fill"],
  },
  {
    id: "graph-components",
    name: "Connected components",
    tell: "The question is which things are connected to which, not how far apart any two of them are.",
    competencies: [
      "traversing from every unvisited node exactly once",
      "keeping global visited state across traversals",
      "counting or measuring components",
      "handling isolated nodes",
    ],
    constraints: [
      "The graph arrives as an int node count plus an int[][] edge list.",
      "The whole edge set is known up front; nothing arrives incrementally.",
      "A correct brute force must recheck reachability from each node separately.",
      "Include an isolated node and a component containing a cycle.",
      "Any collection returned must be in a sorted order the statement specifies.",
    ],
    exclusions: [
      "Must NOT ask for distances or path lengths.",
      "Must NOT interleave connection queries with the edges arriving.",
    ],
    optimalComplexity: {
      easy: "O(V + E)",
      medium: "O(V + E)",
      hard: "O(V + E)",
    },
    bruteForceComplexity: "O(V * (V + E))",
    confusableWith: ["union-find", "graph-bfs", "flood-fill"],
  },
  {
    id: "topological-sort",
    name: "Dependency ordering",
    tell: "Some things must come before others, and you need an order that never breaks a rule, or proof that no such order exists.",
    competencies: [
      "modelling prerequisites as directed edges in the right direction",
      "processing nodes whose dependencies are satisfied",
      "detecting a cycle as the absence of an ordering",
      "recognizing that several valid orders may exist",
    ],
    constraints: [
      "Dependencies arrive as an int count plus an int[][] of directed pairs.",
      "The problem must state which order to return when several are valid, or ask for a property rather than the order itself.",
      "A correct brute force must try permutations and check each one.",
      "Include an input with a cycle and one with independent chains.",
    ],
    exclusions: [
      "Must NOT treat the edges as undirected.",
      "Must NOT ask for a shortest or cheapest route.",
    ],
    optimalComplexity: {
      easy: "O(V + E)",
      medium: "O(V + E)",
      hard: "O(V + E)",
    },
    bruteForceComplexity: "O(V! * E)",
    confusableWith: ["graph-components", "graph-bfs", "dp-1d"],
  },
  {
    id: "union-find",
    name: "Disjoint sets",
    tell: "Connections arrive one at a time, and you keep being asked whether two things are already joined.",
    competencies: [
      "maintaining set membership under merging",
      "recognizing that a traversal per query is too slow",
      "using union by size or rank with path compression",
      "detecting a merge that joins something already joined",
    ],
    constraints: [
      "Connections arrive in order as an int[][], and the answer depends on that order.",
      "The optimal solution must answer each query in near-constant time.",
      "A correct brute force must re-traverse the graph for each query.",
      "Include a redundant connection between already-joined items.",
    ],
    exclusions: [
      "Must NOT be answerable by one traversal of a fully known graph.",
      "Must NOT ask for distances between items.",
    ],
    optimalComplexity: {
      easy: "O(E)",
      medium: "O(E)",
      hard: "O(E log V)",
    },
    bruteForceComplexity: "O(E * (V + E))",
    confusableWith: ["graph-components", "graph-bfs", "topological-sort"],
  },
  {
    id: "dijkstra",
    name: "Weighted shortest path",
    tell: "Steps cost different amounts, so the route with the fewest hops is not necessarily the cheapest one.",
    competencies: [
      "seeing why a plain queue breaks once weights differ",
      "always settling the cheapest frontier node next",
      "keeping best-known distances and skipping stale entries",
      "arguing correctness from non-negative weights",
    ],
    constraints: [
      "The graph arrives as an int node count plus an int[][] where each row is a source, a target, and a positive weight.",
      "Weights must differ enough that the fewest-hop path is not the cheapest.",
      "A correct brute force must enumerate paths.",
      "Include an unreachable node and two paths of equal total cost.",
    ],
    exclusions: [
      "Must NOT make every edge the same weight.",
      "Must NOT include negative weights.",
    ],
    optimalComplexity: {
      easy: "O(E log V)",
      medium: "O(E log V)",
      hard: "O(E log V)",
    },
    bruteForceComplexity: "O(2^V)",
    confusableWith: ["graph-bfs", "heap-top-k", "dp-grid"],
  },
  {
    id: "flood-fill",
    name: "Regions in a grid",
    tell: "A grid has blobs, and the answer is about the size, count, or shape of the connected ones.",
    competencies: [
      "treating cells as nodes and adjacency as edges",
      "keeping visited state to avoid re-counting",
      "handling the grid border without a special case per side",
      "distinguishing four-way from eight-way adjacency",
    ],
    constraints: [
      "The grid arrives as an int[][] or string[][].",
      "The statement must say explicitly which cells count as adjacent.",
      "A correct brute force must rescan the grid until nothing changes.",
      "Include a grid with no region at all and one that is entirely a single region.",
    ],
    exclusions: [
      "Must NOT ask for a cheapest or shortest route through the grid.",
      "Must NOT be a path-counting problem with restricted movement.",
    ],
    optimalComplexity: {
      easy: "O(m * n)",
      medium: "O(m * n)",
      hard: "O(m * n)",
    },
    bruteForceComplexity: "O((m * n)^2)",
    confusableWith: ["graph-components", "graph-bfs", "dp-grid"],
  },
  {
    id: "backtracking",
    name: "Backtracking",
    tell: "You must produce or count arrangements, and the only way to learn that a partial choice fails is to keep extending it.",
    competencies: [
      "building a candidate incrementally and undoing cleanly",
      "pruning a branch as soon as it cannot succeed",
      "avoiding duplicate results when the input repeats",
      "bounding the search well enough to finish",
    ],
    constraints: [
      "The input must be small enough that full enumeration finishes, at most 12 elements.",
      "The optimal solution must prune branches the brute force still explores.",
      "Any collection of results must be returned in sorted order so the answer is deterministic.",
      "Include an input with repeated elements that would produce duplicate results.",
    ],
    exclusions: [
      "Must NOT collapse to a polynomial table of subproblem results.",
      "Must NOT be a subset problem whose state is just a used-item mask.",
    ],
    optimalComplexity: {
      easy: "O(2^n)",
      medium: "O(n * 2^n)",
      hard: "O(n!)",
    },
    bruteForceComplexity: "O(n!)",
    confusableWith: ["dp-bitmask", "dp-interval", "stack-matching"],
  },
  {
    id: "bit-manipulation",
    name: "Bitwise reasoning",
    tell: "The arithmetic is really about individual bits, and pairing or cancelling them collapses the work to a single pass.",
    competencies: [
      "reasoning one bit position at a time",
      "using cancellation rather than counting",
      "keeping signed and unsigned behaviour straight",
      "justifying a constant-space claim",
    ],
    constraints: [
      "The optimal solution must depend on a bitwise identity, not on a hash map.",
      "Values must be non-negative integers with a stated bound.",
      "A correct brute force must count or compare values directly.",
      "Include a value of zero and a value with every bit set within the bound.",
    ],
    exclusions: [
      "Must NOT enumerate subsets using masks as dynamic-programming state.",
      "Must NOT depend on primes, divisors, or modular arithmetic.",
    ],
    optimalComplexity: { easy: "O(n)", medium: "O(n)", hard: "O(32 * n)" },
    bruteForceComplexity: "O(n^2)",
    confusableWith: ["dp-bitmask", "hash-map", "number-theory"],
  },
  {
    id: "number-theory",
    name: "Divisibility and modular arithmetic",
    tell: "The answer falls out of factors, divisibility, or remainders rather than from any clever scan of the data.",
    competencies: [
      "reducing a question to remainders",
      "enumerating divisors only up to the square root",
      "sieving when many values are queried at once",
      "avoiding overflow and negative-remainder mistakes",
    ],
    constraints: [
      "The optimal solution must exploit a number-theoretic fact, not just iterate faster.",
      "Bounds must be stated so the sub-linear or sieve approach is clearly the intended one.",
      "A correct brute force must test candidates one at a time.",
      "Include one, a prime, and a perfect square among the test inputs.",
    ],
    exclusions: [
      "Must NOT rest on bitwise identities.",
      "Must NOT need a table of overlapping subproblem results.",
    ],
    optimalComplexity: {
      easy: "O(sqrt(n))",
      medium: "O(n log log n)",
      hard: "O(n log log n)",
    },
    bruteForceComplexity: "O(n * sqrt(n))",
    confusableWith: ["bit-manipulation", "prefix-sum", "sorting-invariant"],
  },
  {
    id: "string-parsing",
    name: "String parsing",
    tell: "The input is text with a shape to it, and the work is turning that text into structure without losing an edge case.",
    competencies: [
      "walking a string with an explicit cursor",
      "grouping characters into meaningful units",
      "handling empty fields, leading signs, and trailing separators",
      "keeping the scan linear rather than repeatedly slicing",
    ],
    constraints: [
      "Input is a string or a string[], and the statement must define the format precisely.",
      "The optimal solution must be a single pass with a cursor or accumulator.",
      "A correct brute force may use repeated splitting and rescanning.",
      "Include an empty field, a single-token input, and a malformed case if the statement allows one.",
    ],
    exclusions: [
      "Must NOT depend on matching nested opening and closing symbols.",
      "Must NOT compare two strings with a table of subproblem results.",
    ],
    optimalComplexity: { easy: "O(n)", medium: "O(n)", hard: "O(n)" },
    bruteForceComplexity: "O(n^2)",
    confusableWith: ["stack-matching", "hash-map", "dp-subsequence"],
  },
];

export const ARCHETYPE_IDS = ARCHETYPES.map((item) => item.id);

export function findArchetype(id: string) {
  return ARCHETYPES.find((item) => item.id === id) ?? null;
}

/**
 * Options for the classify-before-you-code gate: the true archetype plus its
 * most plausible confusions, so a correct answer means recognition rather than
 * elimination.
 */
export function classificationChoices(archetype: Archetype): string[] {
  const distractors = archetype.confusableWith.slice(0, 3);
  return [archetype.id, ...distractors].sort();
}
