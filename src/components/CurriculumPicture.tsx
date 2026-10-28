type Props = { picture: string; label: string };
export function CurriculumPicture({ picture, label }: Props) {
  const [session, choice] = picture.split("-");
  const person = (pose = "stand", female = false) => (
    <g stroke="#294b51" strokeWidth="5" strokeLinecap="round" fill="none">
      <circle cx="115" cy="69" r="18" fill="#edbf9a" />
      {female && (
        <path d="M95 60 Q115 30 137 62 L140 87 L130 72" fill="#45363c" />
      )}
      <path
        d={
          pose === "run"
            ? "M115 88 L108 126 L82 151 M108 126 L144 145 L154 130 M112 101 L86 116 M111 104 L141 87"
            : pose === "sit"
              ? "M115 88 L115 122 L151 122 L151 153 M115 102 L147 109"
              : "M115 88 L115 122 L101 154 M115 122 L129 154 M115 101 L93 118 M115 101 L137 118"
        }
      />
      <path
        d="M102 90 L126 90 L129 121 L101 121 Z"
        fill={female ? "#a06b9d" : "#5ea896"}
        strokeWidth="2"
      />
      {pose === "sit" && (
        <path
          d="M91 123 L132 123 M95 124 L95 153 M130 124 L130 153"
          stroke="#94785b"
        />
      )}
    </g>
  );
  const cat = (fat = false, sleeping = false) => (
    <g stroke="#425155" strokeWidth="3" strokeLinecap="round">
      <ellipse
        cx="123"
        cy="119"
        rx={fat ? 46 : 31}
        ry={fat ? 30 : 17}
        fill="#e6ad66"
      />
      <path d="M87 116 Q57 88 64 139" fill="none" />
      <path
        d={
          sleeping
            ? "M104 131 L90 140 M137 131 L151 138"
            : "M107 131 L85 148 M133 131 L153 146 M145 126 L165 135"
        }
        fill="none"
      />
      <circle cx="154" cy="96" r="23" fill="#e6ad66" />
      <path
        d="M136 79 L137 60 L151 74 M163 75 L178 61 L176 87"
        fill="#e6ad66"
      />
      <path
        d={sleeping ? "M145 94 l7 2 M162 94 l7 2" : "M146 93 l1 1 M165 93 l1 1"}
        strokeWidth="4"
      />
      <path d="M153 103 l6 0 l-3 4 Z" fill="#425155" />
      {sleeping && (
        <text x="78" y="67" fill="#425155" stroke="none" fontSize="22">
          z z
        </text>
      )}
    </g>
  );
  return (
    <svg
      viewBox="0 0 240 180"
      role="img"
      aria-label={label}
      style={{ width: "100%", maxWidth: 260, minHeight: 130 }}
    >
      <rect width="240" height="180" rx="16" fill="#eef7f3" />
      <path d="M15 157 H225" stroke="#aec9bf" strokeWidth="3" />
      {session === "scene" && (
        <g strokeWidth="3">
          <path
            d="M30 112 H215 M48 112 V157 M198 112 V157"
            stroke="#8c7151"
            fill="none"
          />
          <rect
            x="142"
            y="71"
            width="53"
            height="39"
            rx="3"
            fill="#d45f57"
            stroke="#8e3934"
          />
          <path
            d={
              choice === "in"
                ? "M152 89 L180 89"
                : choice === "on"
                  ? "M65 106 L98 106"
                  : "M85 146 L118 146"
            }
            stroke="#2865ad"
            strokeWidth="7"
            strokeLinecap="round"
          />
          <path d="M62 135 h26 v14 H62 Z" fill="#70a38b" stroke="#426b59" />
        </g>
      )}
      {session === "F03" &&
        person(choice === "1" ? "sit" : choice === "3" ? "run" : "stand")}
      {session === "F10" && cat(choice === "2", choice === "3")}
      {session === "F14" && (
        <>
          {person("stand")}
          <rect
            x="156"
            y="24"
            width="66"
            height="100"
            fill="#d6e9f1"
            stroke="#7099a8"
            strokeWidth="3"
          />
          {choice === "1" ? (
            <g stroke="#558bbb" strokeWidth="3">
              {[170, 190, 210].map((x) => (
                <path
                  key={x}
                  d={`M${x} 46 l-7 12 M${x} 76 l-7 12 M${x} 101 l-7 12`}
                />
              ))}
            </g>
          ) : choice === "2" ? (
            <g fill="#fff" stroke="#86a9bc">
              {[170, 190, 210].map((x) => (
                <g key={x}>
                  <circle cx={x} cy="50" r="4" />
                  <circle cx={x - 4} cy="82" r="4" />
                  <circle cx={x} cy="107" r="4" />
                </g>
              ))}
            </g>
          ) : (
            <circle cx="189" cy="55" r="20" fill="#f4bf4e" />
          )}
        </>
      )}
      {session === "F17" && (
        <>
          {person("stand", true)}
          {choice !== "3" ? (
            <g stroke="#3b5860" strokeWidth="3">
              <ellipse cx="178" cy="107" rx="23" ry="17" fill="#77b5ce" />
              <circle cx="195" cy="92" r="14" fill="#77b5ce" />
              <path d="M206 91 l13 6 l-13 4" fill="#e5af4e" />
              <path d="M164 116 l-17 8 l10-20" fill="#77b5ce" />
              {choice === "1" ? (
                <>
                  <path d="M215 76 l8-8 M217 88 l11-1" />
                  <text
                    x="167"
                    y="60"
                    fontSize="25"
                    stroke="none"
                    fill="#345961"
                  >
                    ♪
                  </text>
                </>
              ) : (
                <text x="170" y="65" fontSize="22" stroke="none" fill="#345961">
                  z z
                </text>
              )}
            </g>
          ) : (
            <g fill="#b88c62" stroke="#554b42" strokeWidth="3">
              <ellipse cx="174" cy="125" rx="26" ry="17" />
              <circle cx="201" cy="106" r="17" />
              <path d="M188 95 L186 116 L199 103" fill="#79583e" />
              <path d="M217 95 l11-6 M219 110 l10 1" fill="none" />
            </g>
          )}
        </>
      )}
    </svg>
  );
}
