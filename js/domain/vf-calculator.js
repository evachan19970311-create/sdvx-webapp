const GRADE_RATE = {
  s: 1.05,
  aaa_plus: 1.02,
  aaa: 1.0,
  aa_plus: 0.97,
  aa: 0.94,
  a_plus: 0.91,
  a: 0.88,
  b: 0.85,
  c: 0.82,
  d: 0.80
};

const CLEAR_RATE = {
  per: 1.10,
  uc: 1.06,
  comp_max: 1.04,
  comp_ex: 1.02,
  comp: 1.00
};

export function calcVF(level, score, grade, clear) {
  return Math.floor(
    level *
    (score / 10000000) *
    (GRADE_RATE[grade] || 0) *
    (CLEAR_RATE[clear] || 0) *
    20
  );
}
