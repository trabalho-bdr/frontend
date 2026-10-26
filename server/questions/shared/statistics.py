"""Pure descriptive statistics; no HTTP or database dependencies."""

import math, statistics


def percent(a, b):
    return 100 * a / b if b and a is not None else None


def wilson(successes, total):
    if not total:
        return (None, None)
    p = successes / total
    z = 1.96
    d = 1 + z * z / total
    mid = (p + z * z / (2 * total)) / d
    half = z * math.sqrt(p * (1 - p) / total + z * z / (4 * total * total)) / d
    return (100 * max(0, mid - half), 100 * min(1, mid + half))


def correlation(rows, x, y):
    pairs = [
        (r.get(x), r.get(y))
        for r in rows
        if r.get(x) is not None
        and r.get(y) is not None
        and math.isfinite(r[x])
        and math.isfinite(r[y])
    ]
    if len(pairs) < 3:
        return {"n": len(pairs), "pearson": None, "spearman": None}
    (a, b) = zip(*pairs)

    def corr(a, b):
        ma = statistics.mean(a)
        mb = statistics.mean(b)
        den = math.sqrt(sum(((v - ma) ** 2 for v in a)) * sum(((v - mb) ** 2 for v in b)))
        return sum(((v - ma) * (w - mb) for (v, w) in zip(a, b))) / den if den else None

    def ranks(values):
        ordered = sorted(enumerate(values), key=lambda v: v[1])
        out = [0] * len(values)
        i = 0
        while i < len(ordered):
            j = i + 1
            while j < len(ordered) and ordered[j][1] == ordered[i][1]:
                j += 1
            for k in range(i, j):
                out[ordered[k][0]] = (i + j - 1) / 2 + 1
            i = j
        return out

    return {"n": len(pairs), "pearson": corr(a, b), "spearman": corr(ranks(a), ranks(b))}
