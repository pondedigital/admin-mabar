import { useState, type FormEvent } from "react";
import { CheckCircle2, Circle, Trash2, UserPlus } from "lucide-react";
import { useMabar } from "../../context/MabarContext";
import { LEVELS } from "../../lib/pairing";
import type { PlayerLevel } from "../../types/mabar";

const LEVEL_OPTIONS = Object.keys(LEVELS) as PlayerLevel[];

export function PemainTab() {
  const { players, playerRoster, addPlayer, togglePresence, deletePlayer, updatePlayerLevel } =
    useMabar();
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerLevel, setNewPlayerLevel] = useState<PlayerLevel>("Menengah");

  const handleNameChange = (value: string) => {
    setNewPlayerName(value);
    // Nama persis cocok dengan roster klub -> prefill level yang sudah tercatat,
    // supaya pemain yang sama tidak berakhir dengan baris ganda di roster.
    const match = playerRoster.find((p) => p.name.toLowerCase() === value.trim().toLowerCase());
    if (match) setNewPlayerLevel(match.level);
  };

  const handleAddPlayer = (e: FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;
    addPlayer(newPlayerName, newPlayerLevel);
    setNewPlayerName("");
  };

  return (
    <div className="p-4 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
          <UserPlus size={20} className="text-yellow-500" /> Tambah Pemain
        </h2>
        <form onSubmit={handleAddPlayer} className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder="Nama Pemain..."
            value={newPlayerName}
            onChange={(e) => handleNameChange(e.target.value)}
            list="player-roster-suggestions"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
          <datalist id="player-roster-suggestions">
            {playerRoster.map((p) => (
              <option key={p.id} value={p.name} />
            ))}
          </datalist>
          <div className="flex gap-2">
            <select
              value={newPlayerLevel}
              onChange={(e) => setNewPlayerLevel(e.target.value as PlayerLevel)}
              className="flex-1 border border-gray-300 rounded-lg px-2 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm font-medium"
            >
              {LEVEL_OPTIONS.map((level) => (
                <option key={level} value={level}>
                  {LEVELS[level].label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="bg-yellow-400 text-black px-4 py-2 rounded-lg font-bold hover:bg-yellow-500 transition"
            >
              Tambah
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold text-gray-800 mb-3">Daftar Pemain ({players.length})</h2>
        {players.length === 0 ? (
          <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-300">
            <p className="text-sm text-gray-500 font-medium">Belum ada pemain.</p>
            <p className="text-xs text-gray-400 mt-1">
              Silakan tambah pemain terlebih dahulu di atas.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {players.map((player) => (
              <div
                key={player.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  player.present ? "border-yellow-200 bg-yellow-50" : "border-gray-200 bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-3" onClick={() => togglePresence(player.id)}>
                  {player.present ? (
                    <CheckCircle2 className="text-yellow-500 cursor-pointer" size={24} />
                  ) : (
                    <Circle className="text-gray-400 cursor-pointer" size={24} />
                  )}
                  <span className={`font-medium ${!player.present && "text-gray-500 line-through"}`}>
                    {player.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={player.level}
                    onChange={(e) => updatePlayerLevel(player.id, e.target.value as PlayerLevel)}
                    className={`text-xs font-bold px-2 py-1 rounded-lg outline-none cursor-pointer border border-transparent hover:border-gray-300 ${LEVELS[player.level].color}`}
                  >
                    {LEVEL_OPTIONS.map((level) => (
                      <option key={level} value={level}>
                        {LEVELS[level].label}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => deletePlayer(player.id)}
                    className="text-red-400 hover:text-red-600 p-1"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
