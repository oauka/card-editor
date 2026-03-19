import React from "react";
import CardEditor from "./components/CardEditor";

export default function App() {
  const [resetKey, setResetKey] = React.useState(0);
  return (
    <CardEditor
      key={resetKey}
      onReset={() => setResetKey(k => k + 1)}
    />
  );
}
