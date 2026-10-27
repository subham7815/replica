// RFC 4180 parser: quoted fields, escaped quotes, commas/newlines inside quotes, CRLF or LF, optional BOM.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const s = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"' && field === '') {
      quoted = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((f) => f.trim() !== ''));
}

// Spreadsheet apps execute cells starting with these characters as formulas (CSV injection).
// Phone-number-looking values such as "+44 7700 900123" are left alone.
function neutralise(value: string) {
  if (/^[=@\t\r]/.test(value) || /^[+-](?![\d\s().-]*$)/.test(value)) return `'${value}`;
  return value;
}

export function toCsv(rows: (string | number | null | undefined)[][]): string {
  return (
    rows
      .map((r) =>
        r
          .map((cell) => {
            const v = neutralise(cell == null ? '' : String(cell));
            return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
          })
          .join(','),
      )
      .join('\r\n') + '\r\n'
  );
}
