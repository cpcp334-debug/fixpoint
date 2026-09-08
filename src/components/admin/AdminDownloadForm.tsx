export function AdminDownloadForm(props: {
  action: string;
  csrf: string;
  label: string;
  fields?: Record<string, string>;
  className?: string;
  buttonClassName?: string;
}) {
  return (
    <form method="post" action={props.action} className={props.className}>
      <input type="hidden" name="csrf" value={props.csrf} />
      {Object.entries(props.fields || {}).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <button type="submit" className={props.buttonClassName || "text-navy"}>
        {props.label}
      </button>
    </form>
  );
}
