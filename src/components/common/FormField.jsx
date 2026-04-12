function FormField({ label, type = 'text', placeholder, as = 'input', rows = 4 }) {
  const control =
    as === 'textarea' ? (
      <textarea className="form-control premium-input" rows={rows} placeholder={placeholder}></textarea>
    ) : (
      <input className="form-control premium-input" type={type} placeholder={placeholder} />
    );

  return (
    <div className="mb-3">
      {label && <label className="form-label premium-label">{label}</label>}
      {control}
    </div>
  );
}

export default FormField;
