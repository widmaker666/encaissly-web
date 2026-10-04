import { useMemo, useState, type ReactNode } from "react";
import styles from "./Table.module.css";

export interface Column<T> {
  key: string;
  header: string;
  align?: "left" | "right";
  render: (row: T) => ReactNode;
  /** Valeur comparable pour le tri (si absent, colonne non triable même si `sortable` est passé à Table). */
  sortValue?: (row: T) => string | number;
}

interface TableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  sortable?: boolean;
}

/** Table générique (desktop) → cards empilées en mobile. Remplace les 4 tables quasi identiques du projet. */
export default function Table<T>({ columns, rows, rowKey, onRowClick, sortable }: TableProps<T>) {
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return rows;
    return [...rows].sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      if (av < bv) return -1 * sort.dir;
      if (av > bv) return 1 * sort.dir;
      return 0;
    });
  }, [rows, sort, columns]);

  function toggleSort(col: Column<T>) {
    if (!sortable || !col.sortValue) return;
    setSort((prev) => (prev?.key === col.key ? { key: col.key, dir: prev.dir === 1 ? -1 : 1 } : { key: col.key, dir: 1 }));
  }

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          {columns.map((col) => (
            <th
              key={col.key}
              className={col.align === "right" ? styles.right : undefined}
              onClick={() => toggleSort(col)}
              style={sortable && col.sortValue ? { cursor: "pointer" } : undefined}
            >
              {col.header}
              {sort?.key === col.key && (sort.dir === 1 ? " ↑" : " ↓")}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sorted.map((row) => (
          <tr
            key={rowKey(row)}
            className={onRowClick ? styles.clickable : undefined}
            onClick={() => onRowClick?.(row)}
          >
            {columns.map((col) => (
              <td key={col.key} className={col.align === "right" ? styles.right : undefined} data-label={col.header}>
                {col.render(row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
