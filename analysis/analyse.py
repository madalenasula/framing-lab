#!/usr/bin/env python3
"""Framing Lab v2 reproducible owner-side analysis of V2_Responses CSV export.

Usage: python3 analysis/analyse.py V2_Responses.csv
Optional for exact Welch t CI and p-value: python3 -m pip install scipy
Never publish row-level IDs; output is aggregates only.
"""
import csv
import math
import statistics
import sys
from pathlib import Path

REQUIRED = ['Participant ID', 'Condition', 'Reference CHF', 'WTP CHF']

def read_data(path):
    values = {'low': [], 'high': []}
    ids = set()
    invalid = 0
    with open(path, newline='', encoding='utf-8-sig') as stream:
        reader = csv.DictReader(stream)
        if not all(key in (reader.fieldnames or []) for key in REQUIRED):
            raise ValueError('Export V2_Responses as CSV: missing ' + ', '.join(set(REQUIRED)-set(reader.fieldnames or [])))
        for row in reader:
            pid = row['Participant ID']
            arm = row['Condition']
            try:
                raw = row['WTP CHF'].strip()
                amount = float(raw)
                anchor = int(row['Reference CHF'])
                valid = (pid and pid not in ids and arm in values and anchor == (45 if arm == 'low' else 95)
                         and math.isfinite(amount) and amount.is_integer() and 0 <= amount <= 250)
            except (ValueError, TypeError):
                valid = False
            if not valid:
                invalid += 1
                continue
            ids.add(pid)
            values[arm].append(int(amount))
    return values, invalid

def analyze(path):
    arms, invalid = read_data(path)
    print('Framing Lab v2 | Exploratory analysis | no row-level records printed')
    print(f'Rejected/duplicate/invalid rows: {invalid}')
    for name, values in arms.items():
        if values:
            print(f'{name:4}: n={len(values)} mean=CHF {statistics.mean(values):.2f} '
                  f'median=CHF {statistics.median(values):.2f} '
                  f'SD={statistics.stdev(values):.2f}' if len(values) > 1 else
                  f'{name:4}: n=1 mean=CHF {values[0]:.2f} (SD undefined)')
        else:
            print(f'{name:4}: n=0, no observations')
    low, high = arms['low'], arms['high']
    if len(low) < 2 or len(high) < 2:
        print('Mean difference/CI not reported: need at least 2 observations per arm.')
        return
    diff = statistics.mean(high) - statistics.mean(low)
    v1 = statistics.variance(low)/len(low)
    v2 = statistics.variance(high)/len(high)
    se = math.sqrt(v1+v2)
    df = (v1+v2)**2 / (v1**2/(len(low)-1) + v2**2/(len(high)-1)) if (v1+v2)>0 else float('inf')
    print(f'High minus low mean difference: CHF {diff:.2f}')
    try:
        from scipy.stats import t
        critical = t.ppf(0.975, df)
        lo, hi = diff-critical*se, diff+critical*se
        p = 2*t.sf(abs(diff/se),df) if se else (1.0 if diff==0 else 0.0)
        print(f'Welch 95% CI: CHF [{lo:.2f}, {hi:.2f}]; two-sided p={p:.4f}; df={df:.1f}')
    except ImportError:
        print('Install scipy to calculate a Welch t confidence interval and p-value (no normal fallback).')
    print('Limitations: self-selected visitors; hypothetical WTP; price may signal quality; cross-browser duplicates possible.')

if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit('Usage: python3 analysis/analyse.py /path/to/V2_Responses.csv')
    analyze(Path(sys.argv[1]))
