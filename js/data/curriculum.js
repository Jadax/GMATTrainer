/* =====================================================================
   GMAT 750+ Trainer - Curriculum (Learn module content)
   Complete 0→100 syllabus for the GMAT Focus Edition.
   Sections: quant | verbal | dataInsights
   Each topic has: id, name, level (beginner/intermediate/advanced),
   overview (array of paragraphs), formulas (array of {term, def}),
   strategies (array of strings), traps (array of strings),
   examples (array of {question, options, answer, reasoning}),
   check (array of 5 quick-check questions: {q, options, answer}).
   ===================================================================== */

const curriculum = (function () {

  /* Helper builders to keep this file readable */
  function topic(id, name, section, level, parts) {
    return Object.assign({
      id: id,
      name: name,
      section: section,
      level: level,
      overview: [],
      formulas: [],
      strategies: [],
      traps: [],
      examples: [],
      check: []
    }, parts || {});
  }

  const examplesFor = function (exs) {
    return exs.map(function (e) {
      return {
        question: e.q,
        options: e.o,
        answer: e.a,
        reasoning: e.r
      };
    });
  };

  /* ================================================================
     QUANT
     ================================================================ */
  const quantTopics = [
    topic('quant-pct', 'Percentages', 'quant', 'beginner', {
      overview: [
        'Percentages are the single most tested arithmetic concept on the GMAT Focus. A percentage is a fraction with denominator 100: 25% means 25/100 = 1/4.',
        'Three classic operations recur: finding a percent OF a number, expressing one number AS a percent of another, and percent increase/decrease. Always identify which value is the "base" — the thing that is 100%.',
        'On the GMAT, changes are applied successively — a 25% increase followed by a 20% decrease is NOT a 5% net change. Compute each step on the running total: 100 → 125 → 100 (a net 0% change).'
      ],
      formulas: [
        { term: 'Percent of', def: 'x% of y = (x/100) × y' },
        { term: 'Percent change', def: '(new − old) / old × 100' },
        { term: 'Actual change, % to find', def: 'increase ÷ original weight/price' },
        { term: 'Multiplier form', def: 'increase by p% → ×(1 + p/100); decrease by p% → ×(1 − p/100)' },
        { term: 'Consecutive changes', def: 'Multiply multipliers: ×(1+a/100)(1+b/100)(1+c/100)' }
      ],
      strategies: [
        'Use the number 100 as a base to make percentage problems concrete and avoid calculator dependence.',
        'On percent increase, the base is ALWAYS the starting (original) value, not the final value.',
        'Translate word problems: "is" → =, "of" → ×, "what percent" → x/100.',
        'Successive percent changes: pick 100, apply each multiplier step by step. Percentages do not simply add or subtract.'
      ],
      traps: [
        'Taking 20% off AFTER a 25% increase — the discount applies to the increased price, not the original.',
        'Confusing "percent increase" with "percent of". A number increases from 80 to 100: that is a 25% increase, but 100 is 125% of 80.',
        'Adding or subtracting percentage points instead of multiplying multipliers.',
        'Misidentifying the base in "x is what percent greater/less than y" — the base is y.'
      ],
      examples: examplesFor([
        { q: 'A price of $80 is increased by 25% and then decreased by 20%. What is the final price?',
          o: ['$76', '$80', '$84', '$88', '$96'],
          a: 'B',
          r: 'Apply multipliers: 80 × 1.25 = 100, then 100 × 0.80 = 80. The two changes cancel out because 1.25 and 0.80 multiply to exactly 1.' },
        { q: 'If 40% of x is 12, what is 60% of x?',
          o: ['16', '18', '20', '24', '30'],
          a: 'B',
          r: 'x = 12/0.40 = 30. Then 60% of 30 = 18. Quicker: 60% is 1.5 × 40%, so 12 × 1.5 = 18.' },
        { q: 'A number decreases from 150 to 120. What is the percent decrease?',
          o: ['15%', '20%', '25%', '30%', '33⅓%'],
          a: 'B',
          r: 'Change = 150 − 120 = 30. Base is the original 150. Decrease = 30/150 = 20%.' },
        { q: 'Last year a store\'s revenue was $200,000. This year it rose 10% and next year it is expected to rise another 10%. Expected revenue?',
          o: ['$220,000', '$240,000', '$242,000', '$244,000', '$260,000'],
          a: 'C',
          r: 'Successive multipliers: 200,000 × 1.10 × 1.10 = 200,000 × 1.21 = $242,000.' },
        { q: 'If $A is 5% of $B and $C is 20% of $B, then $A is what percent of $C?',
          o: ['20%', '25%', '40%', '75%', '400%'],
          a: 'B',
          r: 'A = 0.05B, C = 0.20B, so A/C = 0.05/0.20 = 0.25 = 25%.' }
      ]),
      check: [
        { q: '30% of 70 = ?', o: ['18', '21', '24', '27', '2100'], a: 1 },
        { q: 'Increase 50 by 40%: result is?', o: ['60', '70', '80', '90', '100'], a: 1 },
        { q: 'Decrease 60 by 15%: result is?', o: ['45', '48', '51', '54', '57'], a: 2 },
        { q: '24 is what percent of 96?', o: ['20%', '25%', '30%', '33⅓%', '40%'], a: 1 },
        { q: 'A 20% increase followed by a 20% decrease is a net change of:', o: ['0%', '+4%', '−4%', '+2%', '−2%'], a: 2 }
      ]
    }),

    topic('quant-ratios', 'Ratios', 'quant', 'beginner', {
      overview: [
        'A ratio is a comparison of two or more quantities, written a:b or a/b. A ratio gives no absolute sizes — only relative sizes. The same ratio 1:2 describes 1 and 2 oranges, or 10 and 20 oranges.',
        'Ratios behave like fractions: you can scale both terms by the same factor. The key GMAT move is to introduce a common multiplier k: if the ratio of apples to oranges is 2:3, write apples = 2k, oranges = 3k.',
        'When a ratio relates to a total, divide the total by the sum of the parts to find k, then multiply back to each part.'
      ],
      formulas: [
        { term: 'Split by ratio', def: 'a:b with total T → share of a = [a/(a+b)] × T' },
        { term: 'Combined ratios', def: 'a:b and b:c → make b equal in both to form a:b:c' },
        { term: 'Proportion solve', def: 'a/b = c/d → ad = bc (cross multiply)' }
      ],
      strategies: [
        'Introduce a multiplier k for each part of the ratio whenever totals or differences are given.',
        'For three-plus quantities ("x:y:z = 1:2:3 and x+y+z = 60"), shares are k, 2k, 3k with 6k = 60.',
        'Cross-multiply proportions only after scaling ratios to a common unit.'
      ],
      traps: [
        'Assuming a ratio gives actual quantities — 2:3 could be 2 & 3 or 20 & 30.',
        'Adding/subtracting ratio terms directly without the multiplier.',
        'Mixing ratios with different bases (e.g., juice:water in two different containers).'
      ],
      examples: examplesFor([
        { q: 'In a class the ratio of boys to girls is 3:5, and there are 40 students. How many boys?',
          o: ['12', '15', '18', '20', '24'],
          a: 'B',
          r: 'Total parts = 3 + 5 = 8, so k = 40/8 = 5. Boys = 3k = 15.' },
        { q: 'If the ratio 4:7 equals the ratio x:28, what is x?',
          o: ['12', '14', '16', '18', '20'],
          a: 'C',
          r: '4/7 = x/28 → x = 4 × 28/7 = 16.' },
        { q: 'A sum of $400 is split in the ratio 1:3:4. What is the largest share?',
          o: ['$50', '$100', '$150', '$200', '$300'],
          a: 'D',
          r: 'Parts total 8, k = 400/8 = 50. Largest = 4k = $200.' },
        { q: 'The ratio of women to men in an office is 5:2. If 10 more women were hired the new ratio would be 3:1. How many men are there?',
          o: ['10', '20', '30', '40', '50'],
          a: 'C',
          r: 'women = 5k, men = 2k. After: (5k + 10)/2k = 3 → 5k + 10 = 6k → k = 10, so men = 20.' },
        { q: 'If a:b = 2:3 and b:c = 4:5, what is a:c?',
          o: ['8:15', '2:5', '3:4', '8:5', '5:8'],
          a: 'A',
          r: 'Combine: a:b:c = 8:12:15, so a:c = 8:15.' }
      ]),
      check: [
        { q: 'Ratio 2:5, total 35 → the second quantity is?', o: ['10', '15', '20', '25', '30'], a: 3 },
        { q: 'x:y = 6:9 reduces to?', o: ['2:3', '3:2', '6:9', '1:1.5', '4:6'], a: 0 },
        { q: 'If a/b = 3/5 and a = 12, then b = ?', o: ['15', '20', '25', '30', '36'], a: 1 },
        { q: 'Ratio 7:9, difference is 6 → smaller part is?', o: ['14', '18', '21', '27', '42'], a: 2 },
        { q: 'Sum of ratio parts 1:2:3 with total 24 → middle part is?', o: ['4', '6', '8', '10', '12'], a: 2 }
      ]
    }),

    topic('quant-fracdec', 'Fractions & Decimals', 'quant', 'beginner', {
      overview: [
        'Fluency with fractions and decimals underpins most quantitative questions. The GMAT rewards knowing common fraction–decimal–percent equivalencies cold: 1/8 = 0.125 = 12.5%, 1/3 ≈ 0.333, 2/5 = 0.4, and so on.',
        'Operation rules: to add/subtract fractions, use a common denominator. To divide by a fraction, multiply by its reciprocal. Compare fractions by cross-multiplying or using a common denominator.',
        'Terminating decimals come only from fractions whose reduced denominator has no prime factors other than 2 and 5.'
      ],
      formulas: [
        { term: 'a/b + c/d', def: '(ad + cb) / bd' },
        { term: 'a/b ÷ c/d', def: '(a/b) × (d/c)' },
        { term: 'Reciprocal', def: 'n → 1/n; sign preserved for negatives' },
        { term: 'Repeat decimals', def: '1/6 = 0.1̄6̄, 1/7 = 0.142857̄ (period 6)' }
      ],
      strategies: [
        'Memorize benchmark conversions: 1/4 = 0.25, 1/5 = 0.2, 1/8 = 0.125, 3/8 = 0.375, 1/16 = 0.0625, 2/3 ≈ 0.667.',
        'To compare fractions quickly, cross-multiply: a/b vs c/d ⟺ ad vs cb.',
        'Use 10^k (e.g., 100, 1000) denominators to turn decimals into fractions for exact arithmetic.'
      ],
      traps: [
        'Forgetting that dividing by a fraction multiplies by its reciprocal.',
        'Comparing decimals like 0.7 and 0.699 incorrectly — align decimal places.',
        'Assuming 0.333 = 1/3 exactly — use 1/3 for exact work, 0.333 for estimation.'
      ],
      examples: examplesFor([
        { q: '1/4 + 1/6 = ?',
          o: ['1/10', '5/12', '2/5', '1/3', '1/2'],
          a: 'B',
          r: 'Common denominator 12: 3/12 + 2/12 = 5/12.' },
        { q: 'Which is greatest: 2/3, 7/9, 5/6, 9/11, 11/15?',
          o: ['2/3', '7/9', '5/6', '9/11', '11/15'],
          a: 'C',
          r: 'Convert to denominator 99: 66/99, 77/99, 82.5/99, 81/99, 72.6/99 → 5/6 is greatest.' },
        { q: '(3/5) ÷ (4/7) = ?',
          o: ['12/35', '7/5', '21/20', '35/12', '20/21'],
          a: 'C',
          r: '(3/5) × (7/4) = 21/20.' },
        { q: '0.125 written as a fraction in lowest terms:',
          o: ['1/8', '1/9', '12/100', '1/4', '125/100'],
          a: 'A',
          r: '0.125 = 125/1000 = 1/8.' },
        { q: 'Which fraction has a terminating decimal:',
          o: ['1/3', '1/6', '1/8', '1/7', '1/9'],
          a: 'C',
          r: 'Only 1/8 has denominator (8 = 2³) with no factors other than 2 and 5.' }
      ]),
      check: [
        { q: '1/3 + 1/9 = ?', o: ['1/12', '2/9', '4/9', '4/12', '3/9'], a: 2 },
        { q: '2/5 × 15/4 = ?', o: ['1/2', '3/2', '5/3', '30/20', '2'], a: 1 },
        { q: '5/6 − 1/2 = ?', o: ['1/3', '1/2', '2/3', '5/12', '7/12'], a: 0 },
        { q: '0.75 + 0.125 = ?', o: ['0.800', '0.825', '0.865', '0.875', '0.885'], a: 3 },
        { q: '1/8 of 2/3 = ?', o: ['1/24', '1/12', '3/16', '2/11', '1/6'], a: 1 }
      ]
    }),

    topic('quant-numprops', 'Number Properties', 'quant', 'intermediate', {
      overview: [
        'Number properties tests your command of integers: parity (odd/even), primes, factors, multiples, divisibility, and remainders. A small number of powerful rules carries you through nearly all items.',
        'Even × even = even; odd × odd = odd; even ± odd = odd. Also: the product of any k consecutive integers is divisible by k! (k-factorial), because consecutive integers contain every residue class modulo k.',
        'Prime factorization (the "prime tree") is the master tool. Divisibility by 2, 3, 5, 9, 11 has quick digit tests.'
      ],
      formulas: [
        { term: 'Prime factorization', def: 'Write n as product of primes, e.g., 60 = 2²·3·5' },
        { term: 'Number of factors', def: 'If n = p^a q^b r^c → (a+1)(b+1)(c+1) factors' },
        { term: 'Sum of factors', def: '((p^(a+1)−1)/(p−1)) × ((q^(b+1)−1)/(q−1)) ...' },
        { term: 'GCD & LCM', def: 'GCD: min exponents; LCM: max exponents. GCD×LCM = a×b' },
        { term: 'Digits divisibility', def: '3/9: digit sum divisible by 3/9; 11: alternating sum multiple of 11' }
      ],
      strategies: [
        'On "must be true" items, test one counterexample with small numbers before accepting.',
        'Factor everything. Products like 72 = 8 × 9 hide factors of 2³ and 3².',
        'Remainders: if n = dq + r with 0 ≤ r < d, use small representations like n = 7k + 3.',
        'For divisibility by composite k, check coprime prime-power factors separately (6 → 2 and 3).'
      ],
      traps: [
        '"Divided by 3" vs "3 divided into" — set up n = 3q + r correctly.',
        'GCD of even numbers always includes a factor of 2.',
        '0 and 1 are special: 1 is neither prime nor composite; 0 is even but has no prime factors.',
        'Number of factors formula requires PRIME factorization — do not use composite bases.'
      ],
      examples: examplesFor([
        { q: 'How many distinct prime factors does 90 have?',
          o: ['2', '3', '4', '5', '6'],
          a: 'B',
          r: '90 = 2 × 3² × 5. Distinct primes: 2, 3, 5 → three.' },
        { q: 'How many positive divisors does 48 have?',
          o: ['8', '10', '12', '15', '16'],
          a: 'B',
          r: '48 = 2⁴ × 3. Divisors = (4+1)(1+1) = 10.' },
        { q: 'What is the remainder when 2⁴ is divided by 5?',
          o: ['0', '1', '2', '3', '4'],
          a: 'B',
          r: '2⁴ = 16 = 5×3 + 1 → remainder 1.' },
        { q: 'If n is divisible by both 4 and 6, n must be divisible by:',
          o: ['8', '12', '18', '24', '36'],
          a: 'B',
          r: 'LCM(4,6) = 12. Divisible by both means divisible by their LCM = 12. (n = 12 works but 24 need not, e.g., n = 12.)' },
        { q: 'For how many integers between 1 and 100 inclusive is n³ divisible by 8?',
          o: ['12', '25', '50', '62', '75'],
          a: 'C',
          r: 'n³ divisible by 8 = 2³ means n divisible by 2. There are 50 even integers from 1 to 100.' }
      ]),
      check: [
        { q: 'Which is prime: 21, 37, 49, 51, 77?', o: ['21', '37', '49', '51', '77'], a: 1 },
        { q: 'Number of positive divisors of 36 = ?', o: ['6', '8', '9', '12', '15'], a: 2 },
        { q: 'LCM of 8 and 12 = ?', o: ['4', '24', '48', '72', '96'], a: 1 },
        { q: 'Remainder when 13 is divided by 4:?', o: ['0', '1', '2', '3', '4'], a: 1 },
        { q: 'Is the sum of two odd integers:', o: ['always even', 'always odd', 'even only if equal', 'odd only if different', 'depends'], a: 0 }
      ]
    }),

    topic('quant-alg', 'Algebra: Linear & Quadratic Equations', 'quant', 'intermediate', {
      overview: [
        'Algebra items ask you to solve, interpret, and manipulate equations and expressions. Linear equations (ax + b = c) and quadratic equations (ax² + bx + c = 0) are the staples.',
        'A quadratic with roots r and s factors as (x − r)(x − s) = x² − (r+s)x + rs. The sum of roots is −b/a and the product is c/a — useful shortcuts.',
        'Systems of two linear equations are solved by substitution or elimination. Adding/subtracting the equations can reveal useful expressions like x + y directly.',
        'Set up answer-friendly manipulations: if the question asks for x + y from a system, try adding the equations before solving fully.'
      ],
      formulas: [
        { term: 'Quadratic formula', def: 'x = [−b ± √(b² − 4ac)] / 2a' },
        { term: 'Sum of roots', def: '−b/a; product of roots = c/a' },
        { term: 'Perfect squares', def: '(a±b)² = a² ± 2ab + b²' },
        { term: 'Difference of squares', def: 'a² − b² = (a−b)(a+b)' },
        { term: 'Systems', def: 'Solve by elimination or substitution' }
      ],
      strategies: [
        'Before solving a system, check what the question wants: sometimes adding the equations yields it directly.',
        'For quadratics, look for factorization before the quadratic formula.',
        'Check your solution by plugging back into the original equation.',
        'When only one root has been given, the other is forced by the sum or product of roots.'
      ],
      traps: [
        'Losing a root by "dividing by x" instead of factoring: x² = x ⟹ x=0 or x=1 (never divide by a variable that could be 0).',
        'Sign errors in factoring (x + 3)(x − 2) = x² + x − 6.',
        'Applying the quadratic formula without putting the equation in standard form (zero on one side).'
      ],
      examples: examplesFor([
        { q: 'If 4x + 3 = 19, x = ?',
          o: ['3', '4', '5', '6', '8'],
          a: 'B',
          r: '4x = 16 → x = 4.' },
        { q: 'x² − x − 6 = 0. The larger root is?',
          o: ['−3', '−2', '2', '3', '6'],
          a: 'D',
          r: '(x − 3)(x + 2) = 0 → roots 3 and −2; larger is 3.' },
        { q: '2x + 3y = 11 and 3x + 2y = 9. What is x + y?',
          o: ['2', '3', '4', '5', '6'],
          a: 'C',
          r: 'Add: 5x + 5y = 20 → x + y = 4.' },
        { q: 'If x(x − 1) = 0, which is NOT a solution?',
          o: ['0', '1', '−1', '0 and 1', 'none'],
          a: 'C',
          r: 'Solutions are 0 and 1; −1 is not a solution.' },
        { q: '(x + 2)(x − 5) = 0. Sum of the two solutions?',
          o: ['−3', '−2', '3', '5', '7'],
          a: 'C',
          r: 'Solutions −2 and 5, sum 3. (Or sum of roots = −b/a = −(−3)/1 = 3.)' }
      ]),
      check: [
        { q: '3x − 7 = 2x + 5 → x = ?', o: ['10', '12', '−12', '14', '6'], a: 1 },
        { q: 'x² − 9 = 0 → solutions?', o: ['3 only', '−3 only', '3 and −3', '9', '±9'], a: 2 },
        { q: 'Sum of roots of x² − 7x + 10 = 0', o: ['7', '10', '−7', '−10', '3'], a: 0 },
        { q: 'x − y = 5 and x + y = 11 → x = ?', o: ['3', '6', '8', '9', '11'], a: 2 },
        { q: '(x + 4)² expanded = ?', o: ['x² + 16', 'x² + 8x + 16', 'x² + 4x + 16', 'x² − 8x + 16', 'x² + 8x + 8'], a: 1 }
      ]
    }),

    topic('quant-ineq', 'Inequalities & Absolute Values', 'quant', 'intermediate', {
      overview: [
        'Inequalities behave like equations, with one major warning: multiplying or dividing by a negative number flips the direction of the inequality.',
        'Absolute value is a distance: |x| ≤ a means −a ≤ x ≤ a; |x| ≥ a means x ≤ −a or x ≥ a. On the GMAT, strip absolute values into two cases (the inside can be positive or negative).',
        'Ranges that overlap can be combined into a single interval; "and" intersects, "or" unions.'
      ],
      formulas: [
        { term: '|x| definition', def: '|x| = x if x ≥ 0, −x if x < 0' },
        { term: '|x| ≤ a', def: '−a ≤ x ≤ a' },
        { term: '|x| ≥ a', def: 'x ≤ −a or x ≥ a' },
        { term: 'Flip rule', def: 'Multiply/divide both sides by a negative → reverse the sign' }
      ],
      strategies: [
        'When |expression| = k, write two equations: expression = k and expression = −k. For inequalities, write the compound interval.',
        'On the number line, |x − c| is the distance from x to c.',
        'Keep variables positive where possible to avoid sign flips.',
        'Test endpoints with a candidate value to confirm boundaries are correct.'
      ],
      traps: [
        'Multiplying an inequality by a negative without flipping the sign.',
        'Only considering one sign case for absolute values.',
        'Conflating ≤ boundaries (inclusive) with < boundaries (exclusive) — matters for integer problems.'
      ],
      examples: examplesFor([
        { q: 'If −6 < 2x < 8, then x lies between:',
          o: ['−3 and 4', '−4 and 3', '−12 and 16', '0 and 4', '−6 and 8'],
          a: 'A',
          r: 'Divide by 2: −3 < x < 4.' },
        { q: 'Solutions of |x − 2| = 5:',
          o: ['{3, 7}', '{−3, 7}', '{−7, 3}', '{−7, −3}', '{2, 5}'],
          a: 'B',
          r: 'x − 2 = 5 → x = 7, or x − 2 = −5 → x = −3.' },
        { q: '|x| ≥ 3 is equivalent to:',
          o: ['−3 ≤ x ≤ 3', 'x ≥ 3', 'x ≤ −3', 'x ≤ −3 or x ≥ 3', 'x > 3 or x < −3'],
          a: 'D',
          r: 'Distance from 0 at least 3: x ≤ −3 or x ≥ 3. Answer D (inclusive of ±3).' },
        { q: 'Which of these satisfies −2x + 5 > 11?',
          o: ['−2', '−3', '−4', '1', '2'],
          a: 'C',
          r: '−2x > 6 → x < −3 (divide by −2, flip). Only −4 < −3.' },
        { q: 'For how many integers k does |k| < 4 hold?',
          o: ['4', '6', '7', '8', '9'],
          a: 'C',
          r: '−4 < k < 4 → integers −3, −2, −1, 0, 1, 2, 3 → 7 integers.' }
      ]),
      check: [
        { q: 'x/4 ≥ 3 → x ≥ ?', o: ['6', '8', '12', '3/4', '12 or less'], a: 2 },
        { q: '|x + 1| = 3 → solutions?', o: ['2 and −2', '2 and −4', '−2 and 4', '3 and −3', '4 only'], a: 1 },
        { q: 'Number of integers with |x| ≤ 2:', o: ['3', '4', '5', '6', '7'], a: 2 },
        { q: 'If −3 ≤ x ≤ 5 and x is even, how many values?', o: ['2', '3', '4', '5', '6'], a: 2 },
        { q: 'Solve −2x − 6 > 0:', o: ['x > −3', 'x < −3', 'x < 3', 'x > 3', 'x = −3'], a: 1 }
      ]
    }),

    topic('quant-exponents', 'Functions & Exponents', 'quant', 'intermediate', {
      overview: [
        'Exponent rules turn otherwise hairy expressions into tidy ones. The core laws: x^a · x^b = x^(a+b); x^a / x^b = x^(a−b); (x^a)^b = x^(ab); x^0 = 1; x^(−a) = 1/x^a.',
        'When exponents have the same base, equate exponents to solve. With different bases, convert one side to match (e.g., 8 = 2³, 27 = 3³, 81 = 3⁴).',
        'Function questions define a rule f(x) and ask for values or for which functions obey a property. "Linear, no constant term" functions satisfy f(a+b) = f(a) + f(b) — a signature GMAT pattern.'
      ],
      formulas: [
        { term: 'Product', def: 'x^a · x^b = x^(a+b)' },
        { term: 'Quotient', def: 'x^a / x^b = x^(a−b)' },
        { term: 'Power of power', def: '(x^a)^b = x^(ab)' },
        { term: 'Negative exponent', def: 'x^(−a) = 1/x^a' },
        { term: 'Fractional exponent', def: 'x^(1/n) = ⁿ√x' }
      ],
      strategies: [
        'Reduce every base to a prime first: 4 = 2², 8 = 2³, 16 = 2⁴, 9 = 3², 25 = 5².',
        'For f(a+b) = f(a) + f(b), only linear functions without constant terms qualify.',
        'When an exponent expression equals a power, get the same base on both sides, then set exponents equal.',
        'Beware of even powers: (−2)⁴ = 16, and x⁴ = 16 has two real roots (±2).'
      ],
      traps: [
        'Multiplying bases when you must add exponents: 2³ × 2⁴ = 2⁷, not 4⁷.',
        'Forgetting (ab)^n = a^n b^n but (a + b)^n ≠ a^n + b^n.',
        'Zero exponents: any nonzero base to the 0 is 1; 0⁰ is undefined.'
      ],
      examples: examplesFor([
        { q: '2⁵ × 2³ ÷ 2⁴ = ?',
          o: ['2⁰', '2²', '2³', '2⁴', '2⁵'],
          a: 'D',
          r: 'Exponents add on multiply: 5 + 3 − 4 = 4 → 2⁴.' },
        { q: 'If 2^x = 32, x = ?',
          o: ['3', '4', '5', '6', '8'],
          a: 'C',
          r: '32 = 2⁵, so x = 5.' },
        { q: 'Which is greater: 4⁵ or 2⁹?',
          o: ['4⁵', '2⁹', 'equal', 'cannot compare', 'depends on base'],
          a: 'A',
          r: '4⁵ = (2²)⁵ = 2¹⁰ > 2⁹.' },
        { q: 'If f(x) = x² + 2, f(3) = ?',
          o: ['9', '10', '11', '13', '17'],
          a: 'C',
          r: '3² + 2 = 11.' },
        { q: 'For which of the following functions does f(a) + f(b) = f(a + b) hold for all real values of a and b?',
          o: ['f(x) = x²', 'f(x) = 2x + 3', 'f(x) = −3x', 'f(x) = |x|', 'f(x) = 1/x'],
          a: 'C',
          r: 'Linear functions with no constant term work: f(a)+f(b) = −3a − 3b = −3(a+b) = f(a+b). f(x) = 2x + 3 fails: 2a+3 + 2b+3 ≠ 2(a+b)+3. This is the signature GMAT linearity test.' }
      ]),
      check: [
        { q: '3² × 3³ = ?', o: ['3⁵', '3⁶', '9⁵', '3¹²', '9⁶'], a: 0 },
        { q: '6⁰ = ?', o: ['0', '1', '6', 'undefined', '−6'], a: 1 },
        { q: 'If 9^x = 27, x = ?', o: ['1', '1.5', '2', '3', '4'], a: 1 },
        { q: '(2³)² = ?', o: ['2⁵', '2⁶', '2⁹', '2¹²', '2ᶠ'], a: 1 },
        { q: 'f(x) = 3x − 2; f(4) = ?', o: ['9', '10', '12', '14', '−2'], a: 1 }
      ]
    }),

    topic('quant-wordprobs', 'Word Problems: Rate, Work, Mixtures', 'quant', 'intermediate', {
      overview: [
        'Word problems translate English situations into equations. The workhorse structure is rate × time = quantity. For work problems, the "rate" is the fraction of the job done per unit time, and combined rates add.',
        'Travel problems use distance = rate × time. Opposite directions add speeds (relative speed when pulling apart); same direction subtracts.',
        'Mixture problems are weighted average structures: amount₁ × concentration₁ + amount₂ × concentration₂ = total × target concentration.',
        'The universal technique is to define variables for every unknown, then write one equation per independent condition.'
      ],
      formulas: [
        { term: 'Distance', def: 'd = r × t; time = d/r' },
        { term: 'Work rate', def: 'rate = 1/(time to finish alone); combined = sum of rates' },
        { term: 'Mixture', def: 'a·c₁ + b·c₂ = (a+b)·c_target' },
        { term: 'Relative speed', def: 'opposite → add; same direction → subtract' }
      ],
      strategies: [
        'In work problems use rates (fraction per hour), not times. A alone in 6 h → rate 1/6.',
        'Draw a simple table (Rate × Time = Distance/Work) for travel and work items.',
        'For mixtures, write one equation for the total amount and one for the conserved ingredient (alcohol, solute).',
        'Watch units: hours vs minutes must match on both sides of the equation.'
      ],
      traps: [
        'Adding times instead of rates for combined work — they do NOT add.',
        'Forgetting to account for work already completed when a helper joins.',
        'Using the wrong relative speed sign (adding when trains should subtract).'
      ],
      examples: examplesFor([
        { q: 'A pump fills a tank in 4 hours; a hose empties it in 6 hours. With both running, how long to fill?',
          o: ['2 h', '8 h', '12 h', '24 h', '5 h'],
          a: 'C',
          r: 'Net rate = 1/4 − 1/6 = 1/12 tank/hour → 12 hours.' },
        { q: 'A car travels 240 miles in 4 hours. At the same average speed, how far in 90 minutes?',
          o: ['60 mi', '80 mi', '90 mi', '100 mi', '120 mi'],
          a: 'C',
          r: 'Speed = 60 mph. 90 min = 1.5 h → 60 × 1.5 = 90 miles.' },
        { q: 'How many liters of a 60% acid solution mixed with 10 L of 30% to produce 40%?',
          o: ['2', '3', '5', '6', '10'],
          a: 'C',
          r: '0.6x + 0.3(10) = 0.4(x + 10) → 0.6x + 3 = 0.4x + 4 → 0.2x = 1 → x = 5 L.' },
        { q: 'Bob can paint a room in 4 hours, Ann in 6 hours. Bob paints alone for 1 hour, then they finish together. Total time to finish:',
          o: ['2 h', '2.2 h', '2.8 h', '3 h', '4 h'],
          a: 'C',
          r: 'Bob\'s rate = 1/4, Ann\'s = 1/6. After 1 hour Bob has done 1/4, leaving 3/4. Combined rate = 1/4 + 1/6 = 5/12 per hour. Remaining time = (3/4) ÷ (5/12) = 9/5 = 1.8 h. Total = 1 + 1.8 = 2.8 hours.' },
        { q: 'Two cars start 300 miles apart and drive toward each other at 50 and 70 mph. When will they meet?',
          o: ['2 h', '2.5 h', '3 h', '3.5 h', '4 h'],
          a: 'B',
          r: 'Relative closing = 120 mph. Time = 300/120 = 2.5 hours.' }
      ]),
      check: [
        { q: 'Rate 40 mph for 2.5 h → distance?', o: ['80', '90', '100', '110', '120'], a: 2 },
        { q: 'A does job in 2 h, B in 2 h. Combined rate (per hour) = ?', o: ['1/4', '1/2', '1', '2', '4/1'], a: 2 },
        { q: 'Mixture: 10 L of 50% + 10 L of 30% → final %?', o: ['30%', '38%', '40%', '45%', '50%'], a: 2 },
        { q: 'Moving toward each other at 30 and 50 mph, 160 miles apart → meet in?', o: ['2 h', '3 h', '4 h', '5 h', '8 h'], a: 0 },
        { q: 'Ratio of speeds 3:4, same time → distances ratio?', o: ['4:3', '3:4', '1:1', '9:16', '16:9'], a: 1 }
      ]
    }),

    topic('quant-mixavg', 'Mixtures, Weighted Averages, Profit & Interest', 'quant', 'intermediate', {
      overview: [
        'Weighted averages extend ordinary averages by giving each group\'s mean a weight proportional to its size. If 20 boys average 70 and 30 girls average 80, the class average is (20×70 + 30×80)/50 = 76 — closer to the girls\' mean because they are more numerous.',
        'Profit and interest problems use percentage arithmetic in business clothing: profit = revenue − cost; percent profit is profit ÷ cost. Simple interest = P·r·t; compound interest multiplies the principal by (1 + r) each period.',
        'Discount problems: a 30% discount means pay 70%. Multiple discounts multiply: two successive 10% discounts give 0.9 × 0.9 = 0.81, a 19% effective discount.'
      ],
      formulas: [
        { term: 'Weighted mean', def: '(n₁m₁ + n₂m₂)/(n₁+n₂)' },
        { term: 'Profit', def: 'profit = revenue − cost; %profit = profit/cost × 100' },
        { term: 'Simple interest', def: 'I = P·r·t' },
        { term: 'Compound interest', def: 'A = P(1 + r/n)^(nt)' },
        { term: 'Discount', def: 'final = original × (1 − d₁)(1 − d₂)...' }
      ],
      strategies: [
        'Estimate weighted averages between the two extremes before computing: the result sits between the means, tilted toward the group with more members.',
        'For successive discounts/interest, always multiply multipliers — never add percentages.',
        'In profit problems, "percent profit" uses COST as the base. "Markup on price" uses price.',
        'When two quantities have equal weight, the weighted average is the plain average.'
      ],
      traps: [
        'Using simple interest for compounding questions (and vice versa).',
        'Percent profit on cost vs. margin on sales price: 20% profit = price is 120% of cost.',
        'Averaging averages directly without weighting by group sizes.'
      ],
      examples: examplesFor([
        { q: 'Weighted average: girls\' scores 24 average 70, boys 16 average 85. Class average?',
          o: ['74', '75', '76', '77.5', '78'],
          a: 'C',
          r: '(24×70 + 16×85)/40 = (1680 + 1360)/40 = 3040/40 = 76.' },
        { q: 'A trader buys at $50 and sells at $65. Percent profit on cost?',
          o: ['15%', '20%', '25%', '30%', '40%'],
          a: 'D',
          r: 'Profit = 15; 15/50 = 30%.' },
        { q: 'An item marked $80 is discounted 10% then a further 10% off. Final price?',
          o: ['$64', '$64.80', '$64.90', '$72', '$70'],
          a: 'B',
          r: '80 × 0.9 × 0.9 = 80 × 0.81 = $64.80.' },
        { q: 'Principal $1,000 at 5% simple interest for 3 years: total?',
          o: ['$1,050', '$1,100', '$1,150', '$1,157.63', '$1,500'],
          a: 'C',
          r: 'I = 1000 × 0.05 × 3 = 150; total = $1,150. (D is the compound figure.)' },
        { q: 'Average of 10 numbers is 20; 6 of them average 24. The rest\'s average?',
          o: ['10', '12', '14', '15', '16'],
          a: 'C',
          r: 'Total = 200, six-sum = 144, remaining four sum = 56 → avg 14.' }
      ]),
      check: [
        { q: 'Weighted avg: 5 × 10 + 5 × 30 → average?', o: ['15', '20', '25', '30', '40'], a: 1 },
        { q: 'Cost 20, sold 25 → profit %?', o: ['20%', '25%', '5%', '125%', '80%'], a: 1 },
        { q: 'Compound: $200 at 10% for 2 years → amount?', o: ['$220', '$240', '$242', '$260', '$440'], a: 2 },
        { q: 'Discount 25% off $60 → price?', o: ['$40', '$42', '$45', '$50', '$55'], a: 2 },
        { q: 'Simple interest on $500 at 4% for 5 years → interest?', o: ['$20', '$100', '$120', '$130', '$200'], a: 1 }
      ]
    }),

    topic('quant-statprob', 'Statistics: Mean, Median, SD & Probability', 'quant', 'advanced', {
      overview: [
        'Descriptive statistics on the GMAT: mean (total ÷ count), median (middle of ordered data), mode (most frequent), range (max − min), and standard deviation (a measure of spread).',
        'The median is robust to outliers; the mean is not. Adding a constant to every value shifts mean, median, and mode but leaves the standard deviation and range unchanged. Multiplying every value by a positive constant scales both mean and SD.',
        'Probability is favorable outcomes ÷ total outcomes. Count outcomes systematically (trees, combinations, complementary counting). "At least one" problems are often easiest via the complement: P(at least one) = 1 − P(none).',
        'Independent events multiply: P(A and B) = P(A)·P(B). Mutually exclusive events add: P(A or B) = P(A) + P(B). The additive rule with overlap subtracts P(A and B).'
      ],
      formulas: [
        { term: 'Mean', def: 'sum / count' },
        { term: 'Median', def: 'middle value of an ordered set (average of two middles if even count)' },
        { term: 'Range', def: 'max − min' },
        { term: 'P(event)', def: 'favorable / total' },
        { term: 'P(A at least one)', def: '1 − P(none)' },
        { term: 'P(A or B)', def: 'P(A) + P(B) − P(A and B)' }
      ],
      strategies: [
        'For evenly spaced data sets, mean = median.',
        'Use deviations from the mean to test which set spreads more (larger deviations → larger SD).',
        'On "average of groups" questions, work in sums, not averages.',
        'Simplify probability counting with complements and symmetry.'
      ],
      traps: [
        'Forgetting the even-count median averages the two middle values.',
        'Assuming mean = median for skewed data.',
        'Adding probabilities of overlapping events without subtracting the overlap.',
        '"Without replacement" changes denominators — compute step by step.'
      ],
      examples: examplesFor([
        { q: 'Mean of {2, 4, 6, 8, 10} is 6. If 10 increases to 20, new mean?',
          o: ['7', '8', '9', '10', '12'],
          a: 'B',
          r: 'Sum increases by 10 → mean increases by 10/5 = 2 → new mean 8.' },
        { q: 'Median of {3, 1, 7, 2, 5}:',
          o: ['2', '3', '3.5', '5', '7'],
          a: 'B',
          r: 'Order: 1, 2, 3, 5, 7 → median (3rd of 5) = 3.' },
        { q: 'Probability of rolling a prime number on a standard die:',
          o: ['1/2', '1/3', '2/3', '1/6', '5/6'],
          a: 'A',
          r: 'Primes on a die: 2, 3, 5 → 3 of 6 = 1/2.' },
        { q: 'P(at least one 6) when rolling two dice:',
          o: ['1/6', '1/3', '11/36', '1/36', '5/6'],
          a: 'C',
          r: 'P(none) = (5/6)² = 25/36. P(at least one) = 1 − 25/36 = 11/36.' },
        { q: 'If every number in a list increases by 5, the standard deviation:',
          o: ['increases by 5', 'increases by 25', 'stays the same', 'decreases by 5', 'becomes undefined'],
          a: 'C',
          r: 'Adding a constant shifts the center but not the spread. SD unchanged.' }
      ]),
      check: [
        { q: 'Median of even count {2,4,6,8} = ?', o: ['4', '5', '6', '7', '10'], a: 1 },
        { q: 'P(tails on a fair coin) = ?', o: ['1/3', '1/2', '2/3', '1/4', '1'], a: 1 },
        { q: 'Range of {5, 9, 3, 12} = ?', o: ['6', '7', '8', '9', '12'], a: 2 },
        { q: 'Two coins: P(at least one heads)?', o: ['1/4', '1/2', '3/4', '1/3', '2/3'], a: 2 },
        { q: 'If total = 200 and count = 25, mean = ?', o: ['4', '6', '8', '10', '12'], a: 2 }
      ]
    }),

    topic('quant-dstonly', 'Data Sufficiency fundamentals (Quant side)', 'quant', 'advanced', {
      overview: [
        'Data Sufficiency appears in the Data Insights section, but its core logic is quant thinking: determine whether the given statements, alone or together, are sufficient to answer the question — WITHOUT necessarily solving.',
        'The answer choices never change: (A) (1) alone sufficient; (B) (2) alone sufficient; (C) together but neither alone; (D) each alone sufficient; (E) not sufficient even together.',
        'Practice the AD/BCE elimination drill: evaluate (1) first. If insufficient, the answer is B, C, or E. If sufficient, it is A or D. This halves the work.',
        'Beware of "sufficiency traps": a statement that gives a definite YES or a definite NO is sufficient either way. Sufficiency means UNIQUE answer, not necessarily an affirmative one.'
      ],
      formulas: [
        { term: 'Sufficiency', def: 'Unique value or unique YES/NO answer', },
        { term: 'Elimination', def: '(1) sufficient → A or D; not → B, C, or E', },
        { term: 'Value vs Yes/No', def: 'Value: unique number. Yes/No: consistent YES or consistent NO' }
      ],
      strategies: [
        'Before evaluating statements, mark what the question needs (a number, a relation, a remainder...).',
        'Test statement (1) in isolation first; only combine after both fail alone.',
        'Look for counterexamples with small integers: if you can find two assignments satisfying the statement with different answers, it is insufficient.',
        'Recalibrate: for yes/no questions, "No, because all cases are No" is still sufficient.'
      ],
      traps: [
        'Assuming a statement is insufficient because it seems incomplete — you only need uniqueness.',
        'Failing to consider negative numbers, zero, and fractions as values.',
        'Borrowing facts across statements when evaluating each alone.',
        'Concluding insufficiency from one case without searching for a counterexample.'
      ],
      examples: examplesFor([
        { q: 'DS: What is x?\n(1) x = 3 or x = 5\n(2) x is odd',
          o: ['A', 'B', 'C', 'D', 'E'],
          a: 'E',
          r: '(1) gives two values — insufficient. (2) alone — x could be anything odd. Together: 3 or 5, still two — insufficient. E.' },
        { q: 'DS: Is n even?\n(1) n² is even\n(2) n³ is even',
          o: ['A', 'B', 'C', 'D', 'E'],
          a: 'D',
          r: 'If n² even → n even. If n³ even → n even. Either statement alone forces n even (a definite YES even though never stated explicitly). D.' },
        { q: 'DS: What is p + q?\n(1) 3p + 3q = 24\n(2) p² = q²',
          o: ['A', 'B', 'C', 'D', 'E'],
          a: 'A',
          r: '(1): divide by 3 → p + q = 8. Sufficient. (2): p = ±q, no single answer. A.' },
        { q: 'DS: What percent of a class is female?\n(1) There are 12 males.\n(2) Females exceed males by 6.',
          o: ['A', 'B', 'C', 'D', 'E'],
          a: 'C',
          r: '(1) alone: need total. (2) alone: need males. Together: females = 18, total = 30 → 60%. C.' },
        { q: 'DS: Is k > 10?\n(1) k > 0\n(2) k < 5',
          o: ['A', 'B', 'C', 'D', 'E'],
          a: 'B',
          r: '(1) k > 0 alone: k could be 3 (>10? No) or 20 (>10? Yes) — insufficient. (2) k < 5 alone: k ≤ 4, which is always < 10 — definite No, sufficient. Answer B.'
        }
      ]),
      check: [
        { q: 'DS: x + y = ? (1) x + y + 5 = 13 (2) 2x + 2y = 16', o: ['A', 'B', 'C', 'D', 'E'], a: 0 },
        { q: 'DS: Is x > 0? (1) x² = 9 (2) x³ = 27', o: ['A', 'B', 'C', 'D', 'E'], a: 1 },
        { q: 'DS: p with (1) p = 5q (2) q = 2 and p integer', o: ['A', 'B', 'C', 'D', 'E'], a: 2 },
        { q: 'DS: x² = y² + z²? (1) x = 5 (2) y = 3, z = 4', o: ['A', 'B', 'C', 'D', 'E'], a: 2 },
        { q: 'DS: How many cars? (1) 40 sedans (2) sedans are 50% of total', o: ['A', 'B', 'C', 'D', 'E'], a: 2 }
      ]
    })
  ];

  /* ================================================================
     VERBAL
     ================================================================ */
  const verbalTopics = [
    topic('verbal-rc-main', 'Reading Comprehension: Main Idea & Tone', 'verbal', 'beginner', {
      overview: [
        'Reading Comprehension passages on the GMAT Focus are the backbone of the Verbal section: 3–4 passages per test, typically 200–320 words each, drawn from humanities, social science, and physical science.',
        'Main-idea questions ask what the passage is "primarily concerned with." The correct answer covers the WHOLE passage — including the twist or qualification at the end — not just the opening claim or one body paragraph.',
        'Tone questions ask for the author\'s attitude. Signal words ("however," "but," "surprisingly," "unfortunately") betray attitude. Correct tone answers are usually measured and moderate — extreme words like "dismissive," "triumphant," or "outraged" are rarely right.'
      ],
      formulas: [
        { term: 'Main idea =', def: 'Subject + claim + scope of the whole passage' },
        { term: 'Tone ladder', def: 'neutral → cautiously supportive → critical → hostile/celebratory' },
        { term: 'Signal words', def: 'however, but, although, surprisingly, notably, ironically' }
      ],
      strategies: [
        'Read the passage once for the skeleton: what\'s being discussed, what\'s the claim, what\'s the transition.',
        'For main idea, eliminate answers that only cover the first paragraph or a single example.',
        'Extreme tone words are red flags; qualified, balanced wording usually wins.',
        'Paraphrase the main idea in your own words BEFORE reading the answer choices.'
      ],
      traps: [
        'Choosing a detail that appears but doesn\'t dominate the passage.',
        'Reading an author\'s attitude as stronger than it is (e.g., "questions" ≠ "rejects").',
        'Picking an answer that restates a sentence verbatim but generalizes too far.'
      ],
      examples: examplesFor([
        { q: 'A passage discusses a sea-ice decline, lists three proposed causes, and concludes they interact. Main idea?',
          o: ['Ice decline has one cause', 'The decline results from interacting, reinforcing factors', 'Scientists disagree about whether ice is declining', 'More research funding is needed', 'The decline only affects polar regions'],
          a: 'B',
          r: 'The conclusion ("these pressures interact") governs the main idea. Answer B captures causality; the others are too narrow or distort the claim.' },
        { q: 'Author calls a theory "plausible but unproven." Her tone is:',
          o: ['Hostile', 'Skeptical but open', 'Wholly convinced', 'Indifferent', 'Enthusiastic'],
          a: 'B',
          r: '"Plausible" concedes support; "but unproven" withholds endorsement. That is skepticism with an open door.' },
        { q: 'A passage opens praising Method X, but paragraph 2 begins "However, X is rarely cost-effective." Main idea?',
          o: ['X is pioneering', 'X, though promising, has serious practical drawbacks', 'Cost never matters', 'Method Y is introduced', 'The passage rejects all methods'],
          a: 'B',
          r: 'The main idea must include the passage\'s overall verdict — a qualified one. "However" flips the opening enthusiasm into a measured criticism.' }
      ]),
      check: [
        { q: '\"The hypothesis, while ingenious, lacks evidence.\" Tone?', o: ['admiring', 'dismissive', 'skeptical', 'neutral', 'hopeful'], a: 2 },
        { q: 'Passage: methods compared, conclusion favors method B. Main idea?', o: ['A dominates', 'B is superior for the stated purpose', 'They are identical', 'Neither works', 'Test design is bad'], a: 1 },
        { q: 'Which signals attitude best?', o: ['ironically', 'therefore', 'similarly', 'notably none', 'additionally'], a: 0 },
        { q: 'Extreme tone words to avoid picking:', o: ['claims', 'notes', 'denounces', 'observes', 'proposes'], a: 2 },
        { q: 'If author \"raises concerns about a plan,\" she:', o: ['endorses', 'questions', 'celebrates', 'ignores', 'proposes it'], a: 1 }
      ]
    }),

    topic('verbal-rc-detail', 'Reading Comprehension: Detail, Inference & Application', 'verbal', 'intermediate', {
      overview: [
        'Detail ("according to the passage...") questions are the easiest RC payoff: the answer is directly stated. The risk is selecting a trap answer that rearranges fragments of the passage into something untrue.',
        'Inference questions demand a step beyond the text. The answer must be NECESSARILY true given the passage — not merely plausible. The strongest wrong answers go beyond what can be guaranteed.',
        'Application questions ("would most WEAKEN/STRENGTHEN/ILLUSTRATE...") transfer the passage\'s logic to a novel example. Map the passage\'s key causal claim or comparison, then find the option that mirrors it.'
      ],
      formulas: [
        { term: 'Detail anchors', def: 'Match the exact claim + its qualifiers (\"some\", \"often\", \"may\")' },
        { term: 'Inference test', def: 'Is it forced by the passage, or merely consistent with it?' },
        { term: 'Application', def: 'Isolate passage logic → find mirror in options' }
      ],
      strategies: [
        'For detail questions, keep your finger on the sentence that answers it — the correct choice is a faithful paraphrase.',
        'Qualifiers are your friends: an answer with "some"/"often"/"in many cases" matches a cautious author.',
        'For inference, negate the candidate: if the passage tolerates the negation, the inference is not forced.',
        'Application answers must preserve the causal direction of the passage.'
      ],
      traps: [
        'Answers that are true in real life but NOT stated/implied in the passage.',
        '"Must be true" answers that are only "likely" — overreach.',
        'Inverting cause and effect in application items.',
        'Extreme quantifiers (all, never, only) rarely survive the inference test.'
      ],
      examples: examplesFor([
        { q: 'Passage says a subsidy "may reduce emissions in the long run." Which inference is safe?',
          o: ['It reduces emissions now', 'It might reduce emissions eventually', 'It increases emissions', 'It has proven effective', 'It reduces costs'],
          a: 'B',
          r: '"May... in the long run" permits only the guarded inference: it might reduce emissions eventually.' },
        { q: 'Passage: therapy + medication outperform either alone. Application to a new study?',
          o: ['Combined approach should show more benefit than single treatments', 'Medication works alone always', 'Therapy works alone always', 'No treatment works', 'Combinations never help'],
          a: 'A',
          r: 'Mirror the passage\'s comparative logic in the new context.' },
        { q: 'Detail: passage says "the new policy applies to full-time staff." Which detail is supported?',
          o: ['Part-time staff are covered', 'Full-time staff are covered', 'No staff are covered', 'The policy is voluntary', 'Only managers are exempt'],
          a: 'B',
          r: 'The fact is that the policy covers full-time staff. Everything else adds claims not stated in the passage.' }
      ]),
      check: [
        { q: 'Applies the passage\'s causal logic to a new case → which type?', o: ['detail', 'application', 'main idea', 'tone', 'structure'], a: 1 },
        { q: 'Detail answers must be:', o: ['paraphrased faithfully', 'beyond the text', 'extreme', 'vague', 'long'], a: 0 },
        { q: 'An inference is valid if:', o: ['plausible', 'forced by text', 'true in reality', 'often true', 'wishful'], a: 1 },
        { q: '\"All cats are pets\" - safest inference?', o: ['all pets are cats', 'some pets are cats', 'no pets are cats', 'cats are rare', 'nothing'], a: 1 },
        { q: 'Trap answer that overreaches uses:', o: ['always', 'sometimes', 'possibly', 'maybe', 'perhaps'], a: 0 }
      ]
    }),

    topic('verbal-rc-structure', 'Reading Comprehension: Structure & Author\'s Intent', 'verbal', 'intermediate', {
      overview: [
        'Structure questions ask how the passage is organized: "The second paragraph serves primarily to..." or "Which best describes the development of the passage?"',
        'Recurring structures: prevailing view minus complicating evidence; problem → proposed solution → critique; phenomenon → hypotheses → evaluation; comparison of two theories.',
        'Author\'s-intent questions probe why a detail appears: to illustrate, qualify, concede, counter, or transition. The correct answer describes the FUNCTION, not the content.'
      ],
      formulas: [
        { term: 'Structural verbs', def: 'illustrate, qualify, concede, counter, trace, contrast, synthesize' },
        { term: 'Passage arcs', def: 'claim→evidence→qualify | problem→solution→limits | phenomenon→explanations→adjudicate' }
      ],
      strategies: [
        'For each paragraph, write a one-line label as you read (e.g., "gives counterevidence").',
        'Function questions: ask "what job does this sentence do for the argument?" rather than restating it.',
        'Watch the opening and closing sentences — they often anchor the structure.',
        'Distinguish "primary purpose" (whole passage) from "function of a part."'
      ],
      traps: [
        'Answering content when the question asks for function.',
        'Confusing "a question is raised" with "a problem is solved."',
        'Selecting "comparison" for a passage that never actually compares.'
      ],
      examples: examplesFor([
        { q: 'Last paragraph begins "However, recent evidence suggests..." Its function?',
          o: ['Reinforce the earlier claim', 'Introduce counter-evidence, qualifying it', 'Summarize', 'Define a term', 'Provide background'],
          a: 'B',
          r: '"However" + evidence = counter to steer, qualifier to the thesis.' },
        { q: 'Passage: phenomenon, then three explanations, then support for the third. Structure?',
          o: ['definition-then-example', 'phenomenon → competing explanations → adjudication', 'thesis → refutation', 'chronology', 'cause → effect'],
          a: 'B',
          r: 'The pattern exactly matches the phenomenon/explanations/adjudicate arc.' },
        { q: 'A sentence begins "Granted, the data are noisy, but the trend is clear." Function of "Granted..."',
          o: ['To reject the trend', 'To concede a limitation before making the main point', 'To introduce a new topic', 'To define the data', 'To conclude the passage'],
          a: 'B',
          r: '"Granted" concedes the caveat; "but" announces the author\'s actual point. The concession preempts an objection — that is the function.' }
      ]),
      check: [
        { q: '\"For example\" begins a sentence. Function?', o: ['counter', 'illustrate', 'concede', 'define', 'transition', 'never'], a: 1 },
        { q: 'Primary purpose asks to cover:', o: ['a paragraph', 'the whole passage', 'the conclusion', 'the intro only', 'the title'], a: 1 },
        { q: '"Traces the development of X" implies a passage that:', o: ['compares', 'narrates evolution', 'defends', 'defines', 'rejects'], a: 1 },
        { q: 'Function of a concession ("admittedly") is to:', o: ['win agreement', 'weaken self', 'preempt objection', 'add data', 'end'], a: 2 },
        { q: 'Contrast structure requires:', o: ['two entities compared', 'one topic', 'chronology', 'a single study', 'definitions'], a: 0 }
      ]
    }),

    topic('verbal-cr-basics', 'Critical Reasoning: Argument Anatomy & Assumptions', 'verbal', 'beginner', {
      overview: [
        'Critical Reasoning items present short arguments (a conclusion supported by premises) with one question type: strengthen, weaken, find the assumption, infer, evaluate, or describe the flaw.',
        'Break every argument into pieces: Facts (premises) + Claim (conclusion) + Gap (the assumption that makes premises support the claim). Find the conclusion first — it is what you would defend.',
        'An assumption is an unstated premise the argument NEEDS. If the assumption is false, the argument collapses. The "negation test": negate the candidate; if the argument dies, it was a required assumption.'
      ],
      formulas: [
        { term: 'Conclusion cue', def: 'therefore, so, hence, thus, demonstrates, concludes' },
        { term: 'Premise cue', def: 'because, since, given that, as, on the grounds that' },
        { term: 'Negation test', def: 'Assumption required if its negation destroys the argument' }
      ],
      strategies: [
        'Read the question stem BEFORE the argument — it tells you what to hunt for.',
        'Identify the conclusion in your own words before reading answers.',
        'For assumption questions, apply the negation test to each option.',
        'Beware of "must be true" vs "strengthens": a strengthener can merely make the argument more likely; an assumption is mandatory.'
      ],
      traps: [
        'Mistaking a premise for the conclusion.',
        'Choosing a statement the argument takes for granted implicitly? Less concrete — stick to the negated test.',
        'Picking an answer that supports the argument but is not REQUIRED.',
        'Reading "necessary" where only "helpful" is.'
      ],
      examples: examplesFor([
        { q: 'Sales fall because prices rose (argument). The assumption?',
          o: ['Other factors unchanged', 'Prices rose first', 'Customers noticed the price change', 'Prices affect demand', 'Revenue = price × quantity'],
          a: 'C',
          r: 'For "prices rose" to explain falling sales, customers must have noticed. Negate: "customers did not notice the change" → explanation collapses.' },
        { q: '"We should ban plastic bags; they pollute oceans.\" Conclusion?',
          o: ['Plastic bags pollute', 'We should ban plastic bags', 'Oceans are polluted', 'People litter', 'Bans work'],
          a: 'B',
          r: '"We should ban" is the recommendation — the conclusion. The pollution fact is the premise.' },
        { q: 'Assumption for: "This drug is safe because it passed trials."',
          o: ['Trials accurately predict safety', 'The drug is cheap', 'Trial patients were healthy', 'Drugs work', 'Safety matters'],
          a: 'A',
          r: 'Negate: trials do NOT predict safety → the "safe because passed" argument fails. Required assumption.' }
      ]),
      check: [
        { q: 'Conclusion cue word:', o: ['because', 'since', 'therefore', 'given', 'as'], a: 2 },
        { q: 'Negation test finds:', o: ['weakeners', 'required assumptions', 'premises', 'examples', 'conclusions'], a: 1 },
        { q: '\"Since traffic is heavy, we will be late.\" Premise?', o: ['we will be late', 'traffic is heavy', 'no premise', 'heavy is vague', 'late is bad'], a: 1 },
        { q: 'An argument\'s unstated needed premise is its:', o: ['conclusion', 'assumption', 'example', 'counterargument', 'topic'], a: 1 },
        { q: 'Best to read first:', o: ['answers', 'question stem + argument', 'summary', 'conclusion only', 'nothing'], a: 1 }
      ]
    }),

    topic('verbal-cr-strengthen', 'Critical Reasoning: Strengthen & Weaken', 'verbal', 'intermediate', {
      overview: [
        'Strengthen items ask you to add support; weaken items ask you to puncture. Both hinge on the ASSUMPTION GAP of the argument.',
        'Most arguments reason from a sample to a population, from correlation to causation, or from a premise to a policy. Strengthen by: ruling out alternative causes, providing a control comparison, confirming the mechanism, or closing the sample-population gap.',
        'Weaken by: offering an alternative explanation, showing the comparison was unfair, exposing the sample as unrepresentative, or breaking the causal chain.',
        'The best strengthener/weakener is the one most DIRECTLY on the gap — not merely plausible or true.'
      ],
      formulas: [
        { term: 'Strengthen links', def: 'plug the gap, confirm mechanism, control confounds, apportion causal direction' },
        { term: 'Weaken breaks', def: 'alternative cause, unfair comparison, unrepresentative sample, reverse causation' }
      ],
      strategies: [
        'State the argument\'s conclusion and its one weak link; test each option against that link.',
        'For correlation→causation, remember the four threats: third variable, reverse causation, coincidence, biased sample.',
        'Temporal sequence alone does not prove cause. Look for the option that addresses causality directly.',
        'Documented evidence usually beats calls to evidence.'
      ],
      traps: [
        'Choosing an answer that merely mentions the topic but doesn\'t touch the argument.',
        'Confusing strengthening the premises with strengthening the inference.',
        'Accepting a weaken answer that attacks only a side remark.',
        'Overlooking the possibility of reverse causation in strengthen/weaken items.'
      ],
      examples: examplesFor([
        { q: 'Correlation: towns with gyms have healthier citizens. To weaken?',
          o: ['Wealthier towns have both', 'Gym membership is rising', 'Gyms are cheap', 'Doctors recommend gyms', 'Citizens exercise'],
          a: 'A',
          r: 'Wealth is a third variable explaining both the gyms and the health — the classic correlation killer.' },
        { q: 'Survey: app users lose more weight. To strengthen?',
          o: ['Randomized trial matches this group result', 'App is popular', 'Users like it', 'Non-users are heavier', 'App is free'],
          a: 'A',
          r: 'A controlled experiment supporting the same conclusion removes the most serious (selection) threat.' },
        { q: 'Reduce: \"motor accidents fell after speed cameras.\" Weaken?',
          o: ['Training campaigns launched the same month', 'Cameras are visible', 'Speeds fell', 'Fines rose', 'Drivers know about cameras'],
          a: 'A',
          r: 'A contemporaneous campaign offers an alternative explanation for the decline.' }
      ]),
      check: [
        { q: 'Alternative explanation is a:', o: ['strengthener', 'weakener', 'assumption', 'conclusion', 'premise'], a: 1 },
        { q: 'Confounding variable does what to the causal claim?', o: ['proves', 'undermines', 'supports', 'defines', 'extends'], a: 1 },
        { q: 'Randomized control is a:', o: ['weakener', 'strengthener', 'trap', 'conclusion', 'premise'], a: 1 },
        { q: 'Reverse causation means:', o: ['cause precedes', 'effect precedes cause', 'no link', 'larger samples', 'no effect'], a: 1 },
        { q: 'When asked to WEAKEN, best option:', o: ['touches the gap directly', 'is broadly true', 'restates premise', 'adds detail', 'summarizes'], a: 0 }
      ]
    }),

    topic('verbal-cr-other', 'Critical Reasoning: Inference, Evaluate & Flaws', 'verbal', 'intermediate', {
      overview: [
        'Inference questions ("which must be true") test strict logic: the answer must follow from the given statements. Unlike strengthen/weaken, new information is NOT allowed — only careful combination of the premises.',
        'Evaluate questions offer "which question would be most useful to answer." Map to the gap: the right probe, when answered YES or NO, swings the conclusion. The four threats to correlation (third variable, reverse cause, sampling, coincidence) are the targets.',
        'Flaw (reasoning error) questions describe the error abstractly: correlation treated as causation, part-to-whole generalization, biased sample, false dilemma, circular reasoning, or moving from the possible to the inevitable.'
      ],
      formulas: [
        { term: 'Must-be-true', def: 'Combine premises; no new facts; safe quantifiers' },
        { term: 'Evaluate probe', def: 'YES/NO t asic? answer flips the conclusion' },
        { term: 'Flaw families', def: 'correlation→causation | sample→population | part→whole | false either/or | circular' }
      ],
      strategies: [
        'Inference: draw a mini Venn or set diagram for "some/all/only" premises.',
        'Evaluate: for each option, ask "if answer = yes, does the conclusion get stronger; if no, weaker?" If not, discard.',
        'Flaw: state the error in general terms; avoid options that re-state the conclusion or are too vague to be specific.',
        '"Flawed because it assumes" answers name a faulty assumption — often exactly right.'
      ],
      traps: [
        'Inference: picking something merely compatible instead of necessitated.',
        'Evaluate: choosing a factual question that yields no decision.',
        'Flaw: echoing the topic without naming the logical sin.',
        'Confusing "sample" flaws with "conclusion" attacks.'
      ],
      examples: examplesFor([
        { q: 'Premises: All seniors > 18; some students are seniors. Safe inference?',
          o: ['all students > 18', 'some students > 18', 'no seniors', 'all seniors are students', 'some seniors < 18'],
          a: 'B',
          r: 'Some seniors exist (existence premise), and all seniors > 18 → some students > 18.' },
        { q: 'Evaluate \"city crime fell after new police chief\": probe?',
          o: ['Did crime fall statewide too?', 'Is crime seasonal?', 'Who is the chief?', 'Are cops paid well?', 'When did hiring begin?'],
          a: 'A',
          r: 'If crime fell everywhere, the chief is not the cause; the statewide trend is. This probe can flip the conclusion.' },
        { q: 'Flaw: \"sales rose after we rebranded, so the rebrand caused it.\" Error?',
          o: ['correlation implied as causation', 'circular reasoning', 'false dilemma', 'composition', 'appeal to authority'],
          a: 'A',
          r: 'Temporal correlation alone does not establish the cause — the classic error.' }
      ]),
      check: [
        { q: 'Must-be-true questions forbid:', o: ['combining premises', 'new facts', 'logic', 'diagrams', 'quantifiers'], a: 1 },
        { q: 'Evaluate probes flip the result when answered:', o: ['yes only', 'no only', 'yes or no', 'never', 'maybe'], a: 2 },
        { q: '\"Since most students like x, the whole school does\" is the ___ flaw.', o: ['sample', 'circular', 'false dilemma', 'attack', 'anecdote'], a: 0 },
        { q: 'Correlation treated as causation is:', o: ['valid', 'a flaw', 'an inference', 'an assumption', 'a premise'], a: 1 },
        { q: 'Circular reasoning means the premise:', o: ['differs from conclusion', 'restates conclusion', 'adds evidence', 'is empirical', 'is denied'], a: 1 }
      ]
    })
  ];

  /* ================================================================
     DATA INSIGHTS
     ================================================================ */
  const diTopics = [
    topic('di-ds', 'Data Sufficiency', 'dataInsights', 'beginner', {
      overview: [
        'Data Sufficiency migrated entirely to the Data Insights section. You evaluate two statements against a fixed set of five answer choices (unique among GMAT sections).',
        'The fixed answer map — (A) (1) alone sufficient; (B) (2) alone sufficient; (C) together but not alone; (D) each alone sufficient; (E) never even together — must be memorized cold.',
        'A statement is sufficient if it yields a UNIQUE value or a UNIQUE yes/no for every allowed case. Both a definite YES and a definite NO count as sufficient.',
        'A calculator is allowed in DI — but sufficiency logic favors testing small cases mentally even more than computation.'
      ],
      formulas: [
        { term: '(A)', def: 'only statement (1) is sufficient' },
        { term: '(B)', def: 'only statement (2) is sufficient' },
        { term: '(C)', def: 'together sufficient; neither alone' },
        { term: '(D)', def: 'each alone sufficient' },
        { term: '(E)', def: 'not sufficient even together' }
      ],
      strategies: [
        'Decide the target first: value or yes/no? Then decide what information the target needs.',
        'Test (1) alone; if sufficient, answer is A or D; if not, B/C/E. Half the work done.',
        'Hunt counterexamples with small integers — two different outcomes ⇒ insufficient.',
        'In yes/no questions, \"definitely no\" is still an answer.'
      ],
      traps: [
        'Plugging both statements in while evaluating one of them alone.',
        'Assuming uniqueness when both statements together merely narrow options (e.g., two possibilities left).',
        'Treating an in-sufficiency as sufficiency because you picked one convenient value.',
        'Ignoring sign and domain constraints (integers, positives, ≠0) in the stem.'
      ],
      examples: examplesFor([
        { q: 'DS: What is the value of k?\n(1) 2k + 3 = 13\n(2) k is between 1 and 10',
          o: ['A', 'B', 'C', 'D', 'E'],
          a: 'A',
          r: '(1) gives k = 5 uniquely — sufficient. (2) gives a range, infinite candidates — insufficient.' },
        { q: 'DS: Is x > y?\n(1) x − y = 2\n(2) x + y = 8',
          o: ['A', 'B', 'C', 'D', 'E'],
          a: 'A',
          r: '(1): x = y + 2 > y — definite YES, sufficient. (2): many pairs (x=8,y=0 vs x=0,y=8) — insufficient.' },
        { q: 'DS: How many integers 1–100 are divisible by m?\n(1) m = 5\n(2) m < 10',
          o: ['A', 'B', 'C', 'D', 'E'],
          a: 'A',
          r: '(1): multiples of 5 → 20 integers, unique. (2): m could be 2,3,...8 different counts — insufficient.' }
      ]),
      check: [
        { q: '(1) sufficient, (2) not → answer', o: ['A', 'B', 'C', 'D', 'E'], a: 0 },
        { q: 'Each alone sufficient → answer', o: ['A', 'B', 'C', 'D', 'E'], a: 3 },
        { q: 'Neither alone nor together → answer', o: ['A', 'B', 'C', 'D', 'E'], a: 4 },
        { q: 'Together only → answer', o: ['A', 'B', 'C', 'D', 'E'], a: 2 },
        { q: 'Definite NO in yes/no question is:', o: ['insufficient', 'sufficient', 'invalid', 'a guess', 'undefined'], a: 1 }
      ]
    }),

    topic('di-msr', 'Multi-Source Reasoning', 'dataInsights', 'intermediate', {
      overview: [
        'Multi-Source Reasoning (MSR) presents 2–3 tabs of information (emails, memos, tables, charts, reports) and asks you to reach conclusions using ONLY the supplied documents.',
        'Some MSR items are multi-part, ending in two or three yes/no questions that are answered together — all must be correct for credit.',
        'The skill is cross-referencing: reconcile dates, dollars, and conditions across documents and spot which document governs which clause of the question.',
        'Watch the interplay of constraints — a deadline from one memo and a receipt rule from another combine to decide the outcome.'
      ],
      formulas: [
        { term: 'Cross-reference', def: 'identify which tab each clause belongs to; check conflicts' },
        { term: 'Conditionals', def: '\"must\", \"except\", \"provided that\" decide the boundary cases' },
        { term: 'Consistency', def: 'discard facts that clash; keep those jointly supported' }
      ],
      strategies: [
        'Skim all tabs first; then read the question and return to the tabs it names.',
        'Underline numbers, dates, and conditions as you read — nearly every MSR question turns on one of them.',
        'For multi-part items, answer each part using the SAME reading of the documents.',
        'When a later document contradicts an earlier one, the later document governs unless the earlier one says otherwise.'
      ],
      traps: [
        'Using outside knowledge instead of the documents.',
        'Missing that a deadline or dollar threshold changes the answer completely.',
        'Assuming the most recent memo overrides others in every case.',
        'Reading a permissive rule as mandatory (or vice versa).'
      ],
      examples: examplesFor([
        { q: 'Tab 1: expenses within 30 days; Tab 2: no receipt under $25. Item: $20 meal, submitted at day 35, no receipt. Outcome?',
          o: ['accepted (no receipt needed)', 'rejected (past deadline)', 'accepted (cheap)', 'ask director', 'depends'],
          a: 'B',
          r: 'The $25 rule affects only the attachment; the 30-day deadline is independent and was breached.' },
        { q: 'Tab A: warehouse capacity 5/wk; Tab B: holiday demand 6/wk for 4 wks. During the period:',
          o: ['capacity sufficient', 'shortfall of 1/wk', 'shortfall of 2/wk', 'constant', 'over-supplied'],
          a: 'B',
          r: 'Demand 6 vs capacity 5 → shortfall of 1 unit per week.' },
        { q: 'Memo A: "Budget approval covers the project." Memo B: "Approval expires if not used within 6 months." A project starts at month 7 with no new approval:',
          o: ['covered by Memo A', 'expired — needs new approval', 'partially covered', 'grandfathered', 'unknown'],
          a: 'B',
          r: 'The date condition in Memo B is decisive: 6-month expiry means the month-7 start has no valid approval.' }
      ]),
      check: [
        { q: 'MSR documents are:', o: ['optional context', 'all authoritative where they apply', 'decorative', 'unrelated', 'replaced by knowledge'], a: 1 },
        { q: 'Conflicting documents → govern:', o: ['the older', 'the controlling/newer', 'neither', 'the shorter', 'the longer'], a: 1 },
        { q: 'Dates, dollars, conditions are:', o: ['fluff', 'the kernels', 'distractions', 'optional', 'unused'], a: 1 },
        { q: 'Should you use outside knowledge?', o: ['yes', 'no - only the tabs', 'sometimes', 'only in inference', 'always'], a: 1 },
        { q: 'Multi-part MSR items require:', o: ['partial credit ok', 'all parts correct', 'one part', 'guessing', 'estimation'], a: 1 }
      ]
    }),

    topic('di-table', 'Table Analysis', 'dataInsights', 'intermediate', {
      overview: [
        'Table Analysis presents a sortable, filterable table of 5–10 rows. You answer an "either/or" style question — typically with binary (yes/no) checkboxes per row, or multi-select of true statements.',
        'The tables reward quick arithmetic: percentages, rankings, and thresholds computed from two or more columns.',
        'Because the tables are genuine data, read carefully: column units (thousands? millions?), row labels, and any "sorted by" hints.'
      ],
      formulas: [
        { term: 'Share/percent', def: 'cell ÷ column total (or row total) × 100' },
        { term: 'Ranking', def: 'sort rows by a metric; answer identify min/max/middle' },
        { term: 'Satisfies rule', def: 'apply the stated threshold to each row' }
      ],
      strategies: [
        'Compute one summary metric per row (share, margin, ratio) before comparing — do not eyeball raw numbers.',
        'Read the question stem for the exact definition of the metric (e.g., \"profit margin = profit ÷ price\").',
        'Reorder mentally (or with paper) rather than guessing from row order.',
        'Answer each row\'s yes/no separately; each is a mini-decision.'
      ],
      traps: [
        'Comparing different units across rows.',
        'Applying the wrong definition of a margin or rate.',
        'Forgetting to check which rows meet EVERY part of a compound rule.',
        'Rounding too early in percent questions.'
      ],
      examples: examplesFor([
        { q: 'Table rows give price & cost; \"margin = profit ÷ price.\" Highest margin?',
          o: ['compute each', 'pick highest price', 'pick lowest cost', 'any row', 'average'],
          a: 'A',
          r: 'You must compute profit per row and divide by that row\'s price — raw prices are irrelevant.' },
        { q: 'Rule: \"ship within 2 days if in stock and city; 5 days otherwise.\" Row in stock, out of town:',
          o: ['2 days', '5 days', '1 day', 'varies', 'cannot tell'],
          a: 'B',
          r: 'Both conditions are required for the fast lane; the row fails one.' },
        { q: 'Table rows list sales ($) and employees; metric = sales per employee. Which row is best on the metric?',
          o: ['the highest total sales', 'the lowest headcount', 'compute division per row first', 'the largest margin', 'the first row'],
          a: 'C',
          r: 'You cannot compare on raw sales or headcount alone — divide each row\'s sales by its own employees before ranking.' }
      ]),
      check: [
        { q: 'Read units carefully because of:', o: ['labels', 'decimals', 'thousands vs millions', 'ordering', 'colors'], a: 2 },
        { q: 'Margin definition must come from:', o: ['assumption', 'the stem', 'the largest column', 'memory', 'the title'], a: 1 },
        { q: 'For yes/no per row, decide:', o: ['one total', 'row by row', 'by guessing', 'only first', 'by font'], a: 1 },
        { q: 'Before comparing rows, compute:', o: ['one summary metric', 'the sum', 'nothing', 'the label', 'the date'], a: 0 },
        { q: 'Compound rules need every part:', o: ['optional', 'met', 'ignored', 'estimated', 'vague'], a: 1 }
      ]
    }),

    topic('di-graphics', 'Graphics Interpretation', 'dataInsights', 'intermediate', {
      overview: [
        'Graphics Interpretation replaces the questions with a scatterplot, bar chart, line graph, pie chart, or a statistical curve. Reading slopes, scales, and trends matters more than raw memorized formulas.',
        'The GMAT Focus uses only clean, labeled charts. Expected tasks: read a value, compute a change or rate, compare shares, and (with statistical curves) apply mean/SD/percentile ideas.',
        'For scatterplots, extract the trend: two well-spaced points give a slope; extrapolate along that trend for predictions, being aware the estimate weakens far from the data.',
        'On bar/line charts, be careful about scale breaks and baseline zeros; for pie charts, percentages must sum to 100%.'
      ],
      formulas: [
        { term: '% change from chart', def: '(new − old)/old × 100' },
        { term: 'Share from pie', def: 'sector % × total' },
        { term: 'Trend extrapolation', def: 'y_new ≈ y₁ + slope × Δx' },
        { term: '±1 SD in normal curve', def: '≈68% within one SD; ±2 SD ≈95%' }
      ],
      strategies: [
        'Convert every value to numbers on your scratch area BEFORE manipulating.',
        'Identify the axes units first — a misread scale destroys an otherwise easy item.',
        'For trend lines, prefer two data points that are far apart to estimate slope.',
        'Percentages on pie charts: convert to absolute numbers when the total is given.'
      ],
      traps: [
        'Confusing the axes (x vs y).',
        'Reading the line vs. the gridline behind it.',
        'Extrapolating far beyond the data range as if certain.',
        'Using percentages of different bases in one comparison.'
      ],
      examples: examplesFor([
        { q: 'Pie: 1,200 respondents; Online 55%, TV 25%, Print 15%, Radio 5%. TV − Radio = ?',
          o: ['120', '240', '300', '360', '480'],
          a: 'B',
          r: 'TV = 25%×1200 = 300; Radio = 5%×1200 = 60; difference 240.' },
        { q: 'Scatter: (10, 80) and (30, 120). Predicted y at 40?',
          o: ['120', '130', '140', '150', '160'],
          a: 'C',
          r: 'Slope = 40/20 = 2 per unit; at x=30 y=120 → at 40, y = 140.' },
        { q: 'Bar chart: Jan 40, Feb 55. "% increase from Jan to Feb"?',
          o: ['15%', '20%', '27.5%', '37.5%', '50%'],
          a: 'D',
          r: 'Change = 15 on a base of 40 → 15/40 = 37.5%. The base for % increase is always the starting value.' }
      ]),
      check: [
        { q: 'First read on any chart:', o: ['title only', 'axes and units', 'colors', 'the largest bar', 'the legend last'], a: 1 },
        { q: 'Pie: sector 12% of 400 = ?', o: ['40', '48', '50', '60', '120'], a: 1 },
        { q: '±1 SD holds about:', o: ['50%', '68%', '95%', '99%', '33%'], a: 1 },
        { q: 'Trend estimates are:', o: ['exact', 'approximate', 'always wrong', 'irrelevant', 'fixed'], a: 1 },
        { q: '% change from 50 to 60:', o: ['10%', '16.7%', '20%', '25%', '50%'], a: 2 }
      ]
    }),

    topic('di-twopart', 'Two-Part Analysis', 'dataInsights', 'advanced', {
      overview: [
        'Two-Part Analysis gives one scenario and asks for two linked values (quant+quant, verbal+verbal, or mixed). You answer both columns together; partial credit is possible but both selections should be coherent.',
        'Quant pairs are usually small systems: two unknowns, two conditions. Identify totals/constraints and solve, then place values in the correct column.',
        'Verbal pairs ask for pairings like "best objection and best reply," or "most strengthens and most weakens." The two answers must be compatible in direction.',
        'Test your chosen pair against BOTH conditions before locking in — a quick sanity check prevents careless column swaps.'
      ],
      formulas: [
        { term: 'Two equations', def: 'x + y = T (total) and a·x + b·y = V (value)' },
        { term: 'Column check', def: 'each selected value must satisfy every stated constraint' },
        { term: 'Verbal pairing', def: 'the two parts must be mutually consistent' }
      ],
      strategies: [
        'For quant pairs, write both equations down and solve; then plug back.',
        'Restrict to the allowed list when solving — often only a few of the provided values work.',
        'For verbal pairs, first choose the more distinctive column (e.g., the objection), then match its reply.',
        'Never leave one column empty; treat both selections as one decision set.'
      ],
      traps: [
        'Swapping the two answers between columns.',
        'Satisfying one condition but not the other (e.g., correct total, wrong value sum).',
        'Choosing a second answer that contradicts the first in verbal pairs.',
        'Forgetting domain restrictions (whole numbers, positive amounts).'
      ],
      examples: examplesFor([
        { q: 'Two-part: tickets $5 adult, $3 child; 40 tickets, $160 total. Adult and child?',
          o: ['20 & 20', '30 & 10', '35 & 5', '25 & 15', '10 & 30'],
          a: 'A',
          r: 'a + c = 40; 5a + 3c = 160 → 5a + 3(40−a) = 160 → 2a = 40 → a = 20, c = 20. Check: 20×5 + 20×3 = 100+60 = 160 ✓.' },
        { q: 'Two-part (verbal-ish): Which claim most strengthens X and which most weakens X?',
          o: ['pick strongest/weakest pair consistently', 'same answer both', 'skip', 'two weakeners', 'reverse'],
          a: 'A',
          r: 'Select the best support for X and the strongest attack on X — the pair must be directionally correct.' },
        { q: 'Two-part (quant): 2x + y = 10 and x − y = 2. Select x and y.',
          o: ['x = 4, y = 2', 'x = 3, y = 4', 'x = 2, y = 6', 'x = 5, y = 0', 'x = 1, y = 8'],
          a: 'A',
          r: 'Add the equations: 3x = 12 → x = 4, then y = 10 − 2(4) = 2. Sanity check: 4 − 2 = 2 ✓.' }
      ]),
      check: [
        { q: 'Adults 15, kids 25, prices 4 & 3. Total revenue?', o: ['125', '130', '135', '140', '150'], a: 2 },
        { q: 'Both columns must together satisfy:', o: ['one condition', 'every condition', 'no condition', 'the total', 'just one'], a: 1 },
        { q: 'Column swap is:', o: ['fine', 'a trap', 'optional', 'easier', 'rare'], a: 1 },
        { q: 'Best objection & best reply =', o: ['compatible pair', 'same idea', 'unrelated', 'two objections', 'two replies'], a: 0 },
        { q: 'Before submitting, always:', o: ['plug back in', 'skip', 'guess', 'shorten', 'reverse order'], a: 0 }
      ]
    })
  ];

  /* ================================================================
     Aggregation & helpers
     ================================================================ */
  const sections = [
    {
      key: 'quant',
      name: 'Quantitative Reasoning',
      short: 'Quant',
      icon: '🔢',
      blurb: '21 questions · 45 minutes · NO calculator. Arithmetic, algebra, word problems, number properties, and statistics.',
      topics: quantTopics
    },
    {
      key: 'verbal',
      name: 'Verbal Reasoning',
      short: 'Verbal',
      icon: '📖',
      blurb: '23 questions · 45 minutes. Reading Comprehension and Critical Reasoning. No Sentence Correction.',
      topics: verbalTopics
    },
    {
      key: 'dataInsights',
      name: 'Data Insights',
      short: 'Data Insights',
      icon: '📊',
      blurb: '20 questions · 45 minutes · calculator allowed. Data Sufficiency, Multi-Source, Tables, Graphics, Two-Part.',
      topics: diTopics
    }
  ];

  const allTopics = quantTopics.concat(verbalTopics, diTopics);

  /* Map each topic to the practice questions that share its tag */
  const topicIdByQuestionTopic = {
    // quant
    'quant-pct': 'arithmetic', 'quant-ratios': 'arithmetic',
    'quant-fracdec': 'arithmetic', 'quant-numprops': 'numbers',
    'quant-alg': 'algebra', 'quant-ineq': 'algebra',
    'quant-exponents': 'algebra', 'quant-wordprobs': 'wordproblems',
    'quant-mixavg': 'wordproblems', 'quant-statprob': 'stats',
    'quant-dstonly': 'ds',
    // verbal
    'verbal-rc-main': 'rc', 'verbal-rc-detail': 'rc',
    'verbal-rc-structure': 'rc', 'verbal-cr-basics': 'cr',
    'verbal-cr-strengthen': 'cr', 'verbal-cr-other': 'cr',
    // data insights
    'di-ds': 'ds', 'di-msr': 'ms', 'di-table': 'ta',
    'di-graphics': 'gi', 'di-twopart': 'tp'
  };

  function questionsForTopic(topicId) {
    var qTopic = topicIdByQuestionTopic[topicId];
    var pool = questionBank.all.filter(function (q) {
      return q.topic === qTopic;
    });
    return pool;
  }

  return {
    sections: sections,
    topics: allTopics,
    questionsForTopic: questionsForTopic,
    topicKeyForQTopic: function (qTopic) {
      for (var t in topicIdByQuestionTopic) {
        if (topicIdByQuestionTopic[t] === qTopic) return t;
      }
      return null;
    }
  };

})();