import type { ReactNode } from 'react'

// Very rich diaries (many treatments, a long period, a note most days) don't
// fit the report's planned pages. Rather than cut information, content that
// runs past the bottom of an A4 sheet moves to a continuation sheet, with the
// same running header and footer. Lists and tables are split between two
// rows; anything else moves whole.
//
// Pages are laid out, measured in the on-screen preview, and cut one
// overflow at a time until every sheet fits; the printed copy uses the same
// cuts.

/** One row of a list or table, told apart in the DOM by `data-row`. */
export interface RowsBlock {
  rows: number
  /** Rows `from` to `to` (exclusive); `continued` when earlier rows are on a previous sheet. */
  render: (from: number, to: number, continued: boolean) => ReactNode
}

/** A block of a page: moved whole, or split between rows. */
export type Block = ReactNode | RowsBlock

export function rowsBlock(rows: number, render: RowsBlock['render']): RowsBlock {
  return { rows, render }
}

function isRows(block: Block): block is RowsBlock {
  return typeof block === 'object' && block !== null && 'render' in block && 'rows' in block
}

/** Start a new sheet before row `row` of block `block` of planned page
 * `page` (row 0 moves the whole block). */
export interface Cut {
  page: number
  block: number
  row: number
}

export interface Part {
  page: number
  block: number
  from: number
  to: number
  node: ReactNode
}

export interface Sheet {
  parts: Part[]
}

/** Planned pages start a new sheet, except after a page that overflowed:
 * once off plan, the next page follows on the continuation sheet rather than
 * leaving most of it blank. */
export function buildSheets(pages: Block[][], cuts: Cut[]): Sheet[] {
  const sheets: Sheet[] = []
  let parts: Part[] = []
  const flush = () => {
    if (parts.length) sheets.push({ parts })
    parts = []
  }
  pages.forEach((blocks, page) => {
    const pageCuts = cuts.filter((c) => c.page === page).sort((a, b) => a.block - b.block || a.row - b.row)
    if (page === 0 || !cuts.some((c) => c.page === page - 1)) flush()
    const part = (block: number, from: number, to: number) => {
      const b = blocks[block]
      parts.push({ page, block, from, to, node: isRows(b) ? b.render(from, to, from > 0) : b })
    }
    blocks.forEach((b, block) => {
      const rows = isRows(b) ? b.rows : 1
      let from = 0
      for (const cut of pageCuts.filter((c) => c.block === block && c.row >= from && c.row < rows)) {
        if (cut.row > from) part(block, from, cut.row)
        flush()
        from = cut.row
      }
      part(block, from, rows)
    })
  })
  flush()
  return sheets
}

const before = (a: Cut, b: Cut) => a.page - b.page || a.block - b.block || a.row - b.row

/** Past this many cuts, stop: a safety net, far above any real report. */
const MAX_CUTS = 150

/** Adds a cut, dropping those after it: they were measured on a layout the
 * new cut changes (content moves up or down), so they are found again. */
export function withCut(cuts: Cut[], cut: Cut): Cut[] {
  if (cuts.length >= MAX_CUTS) return cuts
  return [...cuts.filter((c) => before(c, cut) < 0), cut]
}

/** A4 height in CSS pixels (297 mm at 96 dpi). */
const A4_HEIGHT = 1122.5

const bottomOf = (elements: Iterable<Element>) =>
  Math.max(-Infinity, ...Array.from(elements, (e) => e.getBoundingClientRect().bottom))

/** The first cut that would bring an overflowing sheet back to A4, or null
 * when every sheet fits (or the overflow can't be helped: a single block
 * taller than a sheet). `sections` are the rendered sheets, in order; each
 * part is a `display: contents` element with `data-part` inside `.r-body`. */
export function findCut(sections: HTMLElement[], sheets: Sheet[], cuts: Cut[]): Cut | null {
  for (let s = 0; s < sheets.length; s++) {
    const section = sections[s]
    const body = section?.querySelector<HTMLElement>('.r-body')
    if (!section || !body) continue
    const rect = section.getBoundingClientRect()
    // The preview is scaled down; distances are converted back to layout px.
    const scale = rect.height / section.offsetHeight || 1
    if (section.offsetHeight <= A4_HEIGHT + 1) continue
    const tail = (rect.bottom - body.getBoundingClientRect().bottom) / scale
    const limit = rect.top + (A4_HEIGHT - tail) * scale + 0.5

    const partElements = Array.from(body.querySelectorAll<HTMLElement>(':scope > [data-part]'))
    for (let i = 0; i < partElements.length; i++) {
      const el = partElements[i]
      if (bottomOf(el.children) <= limit) continue
      const part = sheets[s].parts[i]
      const first = i === 0
      const rows = Array.from(el.querySelectorAll<HTMLElement>('[data-row]'))
      let cut: Cut | null = null
      if (rows.length) {
        const over = rows.findIndex((r) => r.getBoundingClientRect().bottom > limit)
        // No row over the line: what follows the rows (a legend, a note)
        // is; the last row goes with it.
        const at = part.from + (over === -1 ? rows.length - 1 : over)
        if (at > part.from) cut = { page: part.page, block: part.block, row: at }
        else if (!first) cut = { page: part.page, block: part.block, row: part.from }
      } else if (!first) {
        cut = { page: part.page, block: part.block, row: part.from }
      }
      if (cut && !cuts.some((c) => c.page === cut.page && c.block === cut.block && c.row === cut.row)) return cut
      break
    }
  }
  return null
}
