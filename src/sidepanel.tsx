import { useState } from "react"

function SidePanel() {
  const [count, setCount] = useState(0)

  return (
    <div
      style={{
        fontFamily: "system-ui, sans-serif",
        padding: 16,
        width: 400,
        height: 400,
        display: "flex",
        flexDirection: "column",
        gap: 12
      }}
    >
      <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
        🌍 Demand Radar
      </h1>

      <p style={{ margin: 0, color: "#666", fontSize: 13 }}>
        AI-powered solution discovery from user pain points
      </p>

      <div style={{
        marginTop: 20,
        padding: 16,
        backgroundColor: "#f5f5f5",
        borderRadius: 8,
        flex: 1
      }}>
        <p style={{ margin: 0, fontSize: 14 }}>
          Side Panel is ready for development!
        </p>
        <p style={{ margin: "8px 0 0 0", fontSize: 12, color: "#888" }}>
          Counter: {count}
        </p>
        <button
          onClick={() => setCount(count + 1)}
          style={{
            marginTop: 12,
            padding: "8px 16px",
            backgroundColor: "#3b82f6",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontSize: 14
          }}
        >
          Increment
        </button>
      </div>
    </div>
  )
}

export default SidePanel
