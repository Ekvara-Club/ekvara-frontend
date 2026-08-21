// Panneau de marque partagé par Login/Register (§16) : Login/RegisterPage
// dupliquaient auparavant exactement le même panneau noir — extrait ici en
// composant purement présentationnel (aucune logique auth, aucun state,
// aucune navigation). La photo (`/imagelogin.jpeg`, vraie photo d'athlète,
// jamais modifiée/remplacée) devient la partie émotionnelle de l'écran, avec
// un overlay pour garantir la lisibilité du wordmark plutôt qu'un simple
// aplat noir vide.
//
// `object-top` : sur un panneau compact (mobile, hauteur maîtrisée), seul le
// bas de la photo est rogné (ceinture/main) — le visage et le plastron
// restent entièrement visibles. Sur desktop (panneau haut, largeur ~50%),
// l'image est contrainte par la hauteur et c'est la largeur qui déborde :
// `object-top` n'y a alors aucun effet vertical, seul le centrage horizontal
// (implicite dans "top") s'applique, ce qui garde le sujet centré.
function AuthBrandPanel() {
  return (
    <div className="relative h-64 w-full overflow-hidden bg-ekvara-black lg:h-auto lg:w-1/2">
      <img
        src="/imagelogin.jpeg"
        alt=""
        loading="eager"
        className="h-full w-full object-cover object-top"
      />

      <div className="absolute inset-0 bg-black/35" aria-hidden="true" />
      <div
        className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"
        aria-hidden="true"
      />

      <div className="absolute inset-x-0 bottom-0 p-6 sm:p-10 lg:p-12">
        <p className="flex items-center gap-2 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
          <span className="h-2 w-2 flex-shrink-0 rounded-full bg-ekvara-lime" aria-hidden="true" />
          EKVARA
        </p>
        <p className="mt-2 max-w-xs text-sm text-white/70">
          Le passeport numérique du compétiteur de taekwondo.
        </p>
      </div>
    </div>
  );
}

export default AuthBrandPanel;
