import React from "react";
import "./ListRow.css";

/**
 * ListRow
 * Shared register row used by Requests, Risks and the Activity log.
 * Layout: [leading] [meta / title / description] [...trailing]
 *
 * Column widths, spacing and hover colour come from CSS variables
 * (--list-row-columns, --list-row-gap, --list-row-padding, --list-row-body-gap,
 * --list-row-hover) so each page can keep its own proportions via className.
 *
 * @param {React.ElementType} [as="article"] - Root element ("button" for clickable rows)
 * @param {string} [className] - Page-specific row class
 * @param {React.ReactNode} [leading] - Icon or category tag in the first column
 * @param {React.ReactNode} [meta] - Small line above the title (tags, ID, date)
 * @param {React.ReactNode} title - Row title, truncated with an ellipsis
 * @param {React.ReactNode | React.ReactNode[]} [description] - Muted line under the title.
 *   A string is truncated on one line; an array is rendered as "a · b · c" and may wrap.
 * @param {React.ReactNode} [trailing] - Badges/dates after the title; each child takes its own column
 */
export function ListRow({
  as: Root = "article",
  className = "",
  leading,
  meta,
  title,
  description,
  trailing,
  ...rest
}) {
  const contextItems = Array.isArray(description) ? description.filter(Boolean) : null;

  return (
    <Root
      className={`list-row ${className}`.trim()}
      {...(Root === "button" ? { type: "button" } : {})}
      {...rest}
    >
      {leading}
      <span className="list-row-body">
        {meta && <span className="list-row-meta">{meta}</span>}
        <strong className="list-row-title">{title}</strong>
        {contextItems ? (
          contextItems.length > 0 && (
            <span className="list-row-context">
              {contextItems.map((item, index) => <span key={index}>{item}</span>)}
            </span>
          )
        ) : (
          description && <span className="list-row-description">{description}</span>
        )}
      </span>
      {trailing}
    </Root>
  );
}

export default ListRow;
