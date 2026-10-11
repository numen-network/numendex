const OPTIONS = [
  {
    label: "25%",
    percent: 25,
  },
  {
    label: "50%",
    percent: 50,
  },
  {
    label: "75%",
    percent: 75,
  },
  {
    label: "Max",
    percent: 100,
  },
];

function QuickAmountButtons({
  disabled = false,
  onSelect,
}) {
  return (
    <div className="quick-amount-buttons">
      {OPTIONS.map(
        (option) => (
          <button
            key={option.percent}
            type="button"
            disabled={disabled}
            onClick={() =>
              onSelect?.(
                option.percent
              )
            }
          >
            {option.label}
          </button>
        )
      )}
    </div>
  );
}

export default QuickAmountButtons;