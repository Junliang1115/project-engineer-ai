import React from "react";
import "../pages/projects/lessons/LessonsPage.css";

/**
 * ListTable
 * Reusable, responsive data table component for engineering registers and list views.
 *
 * @param {Array<{
 *   key: string,
 *   title: React.ReactNode,
 *   width?: string,
 *   align?: "left" | "center" | "right",
 *   className?: string,
 *   headerClassName?: string,
 *   headerStyle?: React.CSSProperties,
 *   cellStyle?: React.CSSProperties,
 *   render?: (row: any, index: number) => React.ReactNode
 * }>} columns - Column configuration definitions
 * @param {Array<any>} data - Array of row records
 * @param {string} [keyField="id"] - Field to uniquely identify each row
 * @param {string} [className="lessons-table list-table"] - Custom CSS class for table
 * @param {string} [wrapperClassName="lessons-table-wrap list-table-wrap"] - Custom CSS class for wrapper
 * @param {React.ReactNode} [emptyState] - Content displayed when data is empty
 * @param {(row: any, index: number) => void} [onRowClick] - Row click callback
 * @param {string | ((row: any, index: number) => string)} [rowClassName] - Custom row class
 * @param {React.CSSProperties} [style] - Wrapper inline style
 */
export function ListTable({
  columns = [],
  data = [],
  keyField = "id",
  className = "lessons-table list-table",
  wrapperClassName = "lessons-table-wrap list-table-wrap",
  emptyState,
  onRowClick,
  rowClassName,
  style,
}) {
  return (
    <div className={wrapperClassName} style={style}>
      <table className={className}>
        <thead>
          <tr>
            {columns.map((col, idx) => (
              <th
                key={col.key || idx}
                style={{
                  ...(col.width ? { width: col.width } : {}),
                  ...(col.align ? { textAlign: col.align } : {}),
                  ...col.headerStyle,
                }}
                className={col.headerClassName || ""}
              >
                {col.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIdx) => {
            const rowKey = row[keyField] ?? rowIdx;
            const computedRowClass =
              typeof rowClassName === "function"
                ? rowClassName(row, rowIdx)
                : rowClassName || "";

            return (
              <tr
                key={rowKey}
                className={computedRowClass}
                onClick={onRowClick ? () => onRowClick(row, rowIdx) : undefined}
                style={onRowClick ? { cursor: "pointer" } : undefined}
              >
                {columns.map((col, colIdx) => {
                  const cellContent = col.render
                    ? col.render(row, rowIdx)
                    : row[col.key];

                  return (
                    <td
                      key={col.key || colIdx}
                      style={{
                        ...(col.align ? { textAlign: col.align } : {}),
                        ...col.cellStyle,
                      }}
                      className={col.className || ""}
                    >
                      {cellContent}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      {(!data || data.length === 0) && emptyState ? (
        <div className="list-table-empty">{emptyState}</div>
      ) : null}
    </div>
  );
}

export default ListTable;
