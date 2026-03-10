import { useState } from "react";
import { C } from "../../constants/theme.js";
import { INFO } from "../../constants/fieldInfo.js";

export default function Tip({ id }) {
  const [show, setShow] = useState(false);
  const txt = INFO[id];
  if (!txt) return null;
  return (
    <span style={{ position: "relative", display: "inline-flex", marginLeft: 6, verticalAlign: "middle" }}>
      <span
        onClick={(e) => {
          e.stopPropagation();
          setShow(!show);
        }}
        style={{
          width: 18,
          height: 18,
          borderRadius: 9,
          background: show ? C.primary : C.lb,
          color: show ? "#fff" : C.lm,
          fontSize: 10,
          fontWeight: 700,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: "all 0.15s",
          flexShrink: 0,
        }}
      >
        ?
      </span>
      {show && (
        <div
          style={{
            position: "absolute",
            bottom: "calc(100% + 8px)",
            left: "50%",
            transform: "translateX(-50%)",
            background: C.lt,
            color: "#fff",
            padding: "10px 14px",
            borderRadius: 10,
            fontSize: 12,
            lineHeight: 1.5,
            width: 260,
            zIndex: 100,
            boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
          }}
        >
          {txt}
          <div
            style={{
              position: "absolute",
              bottom: -5,
              left: "50%",
              transform: "translateX(-50%) rotate(45deg)",
              width: 10,
              height: 10,
              background: C.lt,
            }}
          />
        </div>
      )}
    </span>
  );
}
