/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, BookOpen, Layers, Award, Shuffle, Sparkles } from 'lucide-react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const POKER_COMBINATIONS = [
  {
    rank: 1,
    name: 'Роял-Флеш (Royal Flush)',
    desc: 'Туз, Король, Дама, Валет, 10 одной масти. Непобедимая сильнейшая рука.',
    cards: ['A♠', 'K♠', 'Q♠', 'J♠', '10♠'],
    isRed: false,
  },
  {
    rank: 2,
    name: 'Стрит-Флеш (Straight Flush)',
    desc: 'Пять последовательных карт одной масти. Например: 9-8-7-6-5 червей.',
    cards: ['9♥', '8♥', '7♥', '6♥', '5♥'],
    isRed: true,
  },
  {
    rank: 3,
    name: 'Каре (Four of a Kind)',
    desc: 'Четыре карты одного ранга. При совпадении решает кикер (пятая карта).',
    cards: ['K♠', 'K♥', 'K♦', 'K♣', 'A♦'],
    isRed: false,
  },
  {
    rank: 4,
    name: 'Фулл-Хаус (Full House)',
    desc: 'Тройка одного ранга плюс пара другого ранга (например, 3 Дамы и 2 Семерки).',
    cards: ['Q♠', 'Q♥', 'Q♦', '7♣', '7♦'],
    isRed: false,
  },
  {
    rank: 5,
    name: 'Флеш (Flush)',
    desc: 'Любые пять карт одной масти (не по порядку). При равенстве побеждает старшая карта.',
    cards: ['A♦', 'J♦', '8♦', '6♦', '3♦'],
    isRed: true,
  },
  {
    rank: 6,
    name: 'Стрит (Straight)',
    desc: 'Пять последовательных карт разных мастей. Туз может быть как старшим (A-K-Q-J-10), так и младшим (5-4-3-2-A).',
    cards: ['10♠', '9♥', '8♦', '7♣', '6♠'],
    isRed: false,
  },
  {
    rank: 7,
    name: 'Тройка / Сет (Three of a Kind)',
    desc: 'Три карты одного достоинства и две неспаренные карты (кикеры).',
    cards: ['J♠', 'J♥', 'J♦', 'K♣', '4♦'],
    isRed: false,
  },
  {
    rank: 8,
    name: 'Две пары (Two Pair)',
    desc: 'Две карты одного достоинства плюс две карты другого достоинства и кикер.',
    cards: ['10♠', '10♥', '8♦', '8♣', 'A♠'],
    isRed: false,
  },
  {
    rank: 9,
    name: 'Пара (One Pair)',
    desc: 'Две карты одного достоинства и три разнородных кикера.',
    cards: ['A♠', 'A♥', 'K♦', '9♣', '4♠'],
    isRed: false,
  },
  {
    rank: 10,
    name: 'Старшая карта (High Card)',
    desc: 'Если ни у кого нет комбинации, побеждает рука с наибольшей старшей картой.',
    cards: ['A♠', 'K♥', '8♦', '6♣', '2♠'],
    isRed: false,
  },
];

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'three_card' | 'hands' | 'rounds' | 'actions' | 'pots'>('three_card');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#141518] border border-stone-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-stone-200">
        {/* Header */}
        <div className="p-4 md:p-5 border-b border-stone-800 flex items-center justify-between bg-[#0e0f12]">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-[#C5A880]" />
            <h2 className="text-base md:text-lg font-bold text-stone-100">
              Правила игры: Texas Hold'em и Трёхкарточный покер
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center border-b border-stone-800 bg-[#101115] overflow-x-auto px-4">
          <button
            type="button"
            onClick={() => setActiveTab('three_card')}
            className={`py-3 px-4 text-xs md:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'three_card'
                ? 'border-[#C5A880] text-[#C5A880] bg-[#18191f]'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Трёхкарточный покер (Новый режим)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('hands')}
            className={`py-3 px-4 text-xs md:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'hands'
                ? 'border-[#C5A880] text-[#C5A880] bg-[#18191f]'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            Комбинации Холдема (10)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('rounds')}
            className={`py-3 px-4 text-xs md:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'rounds'
                ? 'border-[#C5A880] text-[#C5A880] bg-[#18191f]'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            Раунды Холдема
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('actions')}
            className={`py-3 px-4 text-xs md:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'actions'
                ? 'border-[#C5A880] text-[#C5A880] bg-[#18191f]'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            Действия и блайнды
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pots')}
            className={`py-3 px-4 text-xs md:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'pots'
                ? 'border-[#C5A880] text-[#C5A880] bg-[#18191f]'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            Побочные банки
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {activeTab === 'three_card' && (
            <div className="space-y-4 text-xs md:text-sm text-stone-300 leading-relaxed">
              <div className="p-4 rounded-xl bg-[#18191f] border border-stone-800 space-y-2">
                <h3 className="font-bold text-stone-100 text-sm md:text-base text-[#C5A880]">
                  Суть игры в Three Card Poker
                </h3>
                <p className="text-stone-400">
                  Трёхкарточный покер — популярная казино-игра, где игрок играет напрямую против дилера. В игре используется стандартная колода из 52 карт, раздаётся ровно по 3 карты игроку и дилеру.
                </p>
              </div>

              {/* Special ranking rule */}
              <div className="p-4 rounded-xl bg-[#18191f] border border-[#C5A880]/30 space-y-2">
                <h4 className="font-bold text-[#C5A880]">
                  Иерархия комбинаций из 3 карт (Отличие от Холдема!)
                </h4>
                <p className="text-stone-400">
                  В 3-карточном покере собрать Тройку математически труднее, чем Стрит, а Стрит труднее, чем Флеш. Поэтому порядок старшинства строго следующий:
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pt-1 font-mono text-xs">
                  <div className="p-2 rounded bg-black/40 border border-stone-800">
                    <span className="text-[#C5A880] font-bold">1. Стрит-Флеш</span> (напр. Q♠ J♠ 10♠)
                  </div>
                  <div className="p-2 rounded bg-black/40 border border-stone-800">
                    <span className="text-[#C5A880] font-bold">2. Тройка (Сет)</span> (напр. 8-8-8)
                  </div>
                  <div className="p-2 rounded bg-black/40 border border-stone-800">
                    <span className="text-[#C5A880] font-bold">3. Стрит</span> (напр. 9-8-7)
                  </div>
                  <div className="p-2 rounded bg-black/40 border border-stone-800">
                    <span className="text-[#C5A880] font-bold">4. Флеш</span> (3 карты одной масти)
                  </div>
                  <div className="p-2 rounded bg-black/40 border border-stone-800">
                    <span className="text-[#C5A880] font-bold">5. Пара</span> (напр. K-K-5)
                  </div>
                  <div className="p-2 rounded bg-black/40 border border-stone-800">
                    <span className="text-stone-400">6. Старшая карта</span>
                  </div>
                </div>
              </div>

              {/* Rules of play & Dealer Qualification */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-[#18191f] border border-stone-800 space-y-1.5">
                  <h4 className="font-bold text-stone-100">Ставки Ante и Play</h4>
                  <p className="text-stone-400 text-xs">
                    Игрок делает начальную ставку <strong>Ante</strong>. Получив 3 карты, игрок решает:
                    сбросить карты (<strong>Fold</strong>, теряя ставку Ante) или продолжить игру (<strong>Play</strong>), сделав ставку равную ставке Ante.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#18191f] border border-stone-800 space-y-1.5">
                  <h4 className="font-bold text-stone-100">Квалификация дилера (Queen-High)</h4>
                  <p className="text-stone-400 text-xs">
                    Дилеру необходима хотя бы <strong>Дама или старше (Q-high)</strong> для квалификации.
                    Если дилер не квалифицировался: ставка Ante оплачивается 1:1, а ставка Play возвращается (Push).
                  </p>
                </div>
              </div>

              {/* Pair Plus & Ante Bonus */}
              <div className="p-4 rounded-xl bg-[#18191f] border border-stone-800 space-y-2">
                <h4 className="font-bold text-amber-300">Бонусные выплаты Pair Plus</h4>
                <p className="text-stone-400 text-xs">
                  Ставка <strong>Pair Plus</strong> выигрывает, если у игрока есть Пара или выше, независимо от руки дилера!
                </p>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-2 font-mono text-xs pt-1">
                  <div className="p-2 rounded bg-black/40 border border-stone-800 text-center">Стрит-Флеш: <span className="text-[#C5A880] font-bold">40:1</span></div>
                  <div className="p-2 rounded bg-black/40 border border-stone-800 text-center">Тройка: <span className="text-[#C5A880] font-bold">30:1</span></div>
                  <div className="p-2 rounded bg-black/40 border border-stone-800 text-center">Стрит: <span className="text-[#C5A880] font-bold">6:1</span></div>
                  <div className="p-2 rounded bg-black/40 border border-stone-800 text-center">Флеш: <span className="text-[#C5A880] font-bold">3:1</span></div>
                  <div className="p-2 rounded bg-black/40 border border-stone-800 text-center">Пара: <span className="text-[#C5A880] font-bold">1:1</span></div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'hands' && (
            <div className="space-y-3">
              <p className="text-xs text-stone-400 mb-2">
                В покере лучшая пятикарточная рука составляется из любых 7 карт (2 карманные карты + 5 общих карт на столе).
              </p>
              {POKER_COMBINATIONS.map((combo) => (
                <div
                  key={combo.rank}
                  className="p-3 rounded-xl bg-[#18191f] border border-stone-800 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-[#C5A880]/40 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-[#C5A880] font-bold">
                        #{combo.rank}
                      </span>
                      <h4 className="font-bold text-stone-100 text-sm md:text-base">
                        {combo.name}
                      </h4>
                    </div>
                    <p className="text-xs text-stone-400 mt-1 leading-relaxed">{combo.desc}</p>
                  </div>

                  {/* Cards display */}
                  <div className="flex items-center gap-1.5 self-start md:self-auto">
                    {combo.cards.map((c, i) => (
                      <div
                        key={i}
                        className={`w-10 h-14 rounded-md bg-white border border-stone-300 text-slate-900 shadow font-bold text-xs flex flex-col items-center justify-center ${
                          c.includes('♥') || c.includes('♦') ? 'text-red-600' : 'text-slate-950'
                        }`}
                      >
                        <span>{c.slice(0, -1)}</span>
                        <span>{c.slice(-1)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'rounds' && (
            <div className="space-y-4 text-sm leading-relaxed text-stone-300">
              <div className="p-4 rounded-xl bg-[#18191f] border border-stone-800 space-y-2">
                <div className="flex items-center gap-2 text-[#C5A880] font-bold">
                  <Layers className="w-4 h-4 text-[#C5A880]" />
                  <span>1. Pre-Flop (Префлоп)</span>
                </div>
                <p className="text-xs text-stone-400">
                  Дилер раздает каждому игроку по 2 закрытые карты. Игроки слева от кнопки дилера ставят малый и большой блайнды. Первый раунд торговли начинается с игрока слева от большого блайнда (UTG).
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#18191f] border border-stone-800 space-y-2">
                <div className="flex items-center gap-2 text-[#C5A880] font-bold">
                  <Layers className="w-4 h-4 text-[#C5A880]" />
                  <span>2. Flop (Флоп)</span>
                </div>
                <p className="text-xs text-stone-400">
                  Дилер сжигает верхнюю карту колоды и выкладывает на стол первые 3 общие карты лицом вверх. Следует второй раунд торговли, начиная с первого активного игрока слева от кнопки дилера.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#18191f] border border-stone-800 space-y-2">
                <div className="flex items-center gap-2 text-[#C5A880] font-bold">
                  <Layers className="w-4 h-4 text-[#C5A880]" />
                  <span>3. Turn (Терн)</span>
                </div>
                <p className="text-xs text-stone-400">
                  Дилер сжигает карту и выкладывает 4-ю общую карту. Игроки проводят третий раунд торговли.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#18191f] border border-stone-800 space-y-2">
                <div className="flex items-center gap-2 text-[#C5A880] font-bold">
                  <Layers className="w-4 h-4 text-[#C5A880]" />
                  <span>4. River (Ривер)</span>
                </div>
                <p className="text-xs text-stone-400">
                  Выкладывается 5-я, заключительная общая карта. Финальный раунд торговли.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#18191f] border border-stone-800 space-y-2">
                <div className="flex items-center gap-2 text-[#C5A880] font-bold">
                  <Award className="w-4 h-4 text-[#C5A880]" />
                  <span>5. Showdown (Вскрытие карт)</span>
                </div>
                <p className="text-xs text-stone-400">
                  Все оставшиеся игроки открывают свои карты. Игрок с лучшей пятикарточной комбинацией забирает банк. При абсолютном равенстве банк делится поровну (Split Pot).
                </p>
              </div>
            </div>
          )}

          {activeTab === 'actions' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-[#18191f] border border-stone-800 space-y-1">
                <h4 className="font-bold text-rose-400">Фолд (Fold)</h4>
                <p className="text-stone-400">
                  Сброс карт и отказ от борьбы за текущий банк. Игрок теряет все ранее поставленные фишки.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-[#18191f] border border-stone-800 space-y-1">
                <h4 className="font-bold text-emerald-400">Чек (Check)</h4>
                <p className="text-stone-400">
                  Пропуск хода без добавления фишек, если в текущем раунде до вас никто не делал ставку.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-[#18191f] border border-stone-800 space-y-1">
                <h4 className="font-bold text-blue-400">Колл (Call)</h4>
                <p className="text-stone-400">
                  Уравнивание текущей наивысшей ставки соперника в данном раунде.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-[#18191f] border border-stone-800 space-y-1">
                <h4 className="font-bold text-[#C5A880]">Бет / Рейз (Bet / Raise)</h4>
                <p className="text-stone-400">
                  Открытие ставки (Бет) или повышение уже сделанной ставки (Рейз). Минимальный рейз равен разнице предыдущего повышения.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-[#18191f] border border-stone-800 space-y-1 md:col-span-2">
                <h4 className="font-bold text-red-400">Ва-банк (All-In)</h4>
                <p className="text-stone-400">
                  Ставка всех оставшихся у игрока фишек. Игрок остается в игре до вскрытия без возможности дальнейших ставок и претендует на банк, пропорциональный своему вкладу.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'pots' && (
            <div className="p-4 rounded-xl bg-[#18191f] border border-stone-800 space-y-3 text-xs leading-relaxed text-stone-300">
              <div className="flex items-center gap-2 text-[#C5A880] font-bold text-sm">
                <Shuffle className="w-4 h-4 text-[#C5A880]" />
                <span>Как работают Side Pots (Побочные банки)</span>
              </div>
              <p>
                Когда игрок идет <strong>All-In</strong> с меньшим количеством фишек, чем у других игроков, создается <strong>Главный банк (Main Pot)</strong> и один или несколько <strong>Побочных банков (Side Pots)</strong>.
              </p>
              <div className="p-3 rounded bg-black/50 border border-stone-700/60 font-mono text-[11px] space-y-1 text-stone-300">
                <div className="text-[#C5A880] font-bold">Пример:</div>
                <div>Игрок A идет All-In на $100.</div>
                <div>Игрок B и Игрок C коллируют по $300.</div>
                <div className="text-emerald-400 pt-1">
                  • Главный банк: $100 * 3 = $300 (Претендуют A, B, C)
                </div>
                <div className="text-blue-400">
                  • Побочный банк: ($300 - $100) * 2 = $400 (Претендуют только B и C)
                </div>
              </div>
              <p className="text-stone-400">
                Игрок A не может выиграть фишки из побочного банка, даже если у него лучшая комбинация. Он забирает только Главный банк, а побочный достается лучшему между B и C.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
