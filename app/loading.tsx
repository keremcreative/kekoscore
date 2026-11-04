/** Sekmeye dokununca sayfa hazırlanırken anında görünen iskelet ekran */
export default function Loading() {
  return (
    <div className="skel-page" aria-busy="true" aria-label="Yükleniyor">
      <div className="skel skel-title" />
      <div className="skel skel-row-chips">
        <span className="skel" />
        <span className="skel" />
        <span className="skel" />
        <span className="skel" />
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="card skel-card">
          <div className="skel skel-head" />
          {[0, 1, 2].map((j) => (
            <div key={j} className="skel-line">
              <span className="skel skel-dot" />
              <span className="skel skel-bar" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
