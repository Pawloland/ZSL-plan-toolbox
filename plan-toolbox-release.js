// ==UserScript==
// @name         ZSŁ plan toolbox
// @version      1.0
// @description  Dodaje przyciski,którymi można wybrać, które grupy mają być widoczne na planie lekcji.
// @author       Paweł Mączałowski aka Pawloland
// @match        https://plan.tl.krakow.pl/plan/*
// @grant        none
// @updateURL    https://raw.githubusercontent.com/Pawloland/ZSL-plan-toolbox/master/plan-toolbox-release.js
// @downloadURL  https://raw.githubusercontent.com/Pawloland/ZSL-plan-toolbox/master/plan-toolbox-release.js
// ==/UserScript==

(function () {
    'use strict';

    // Your code here...

    let log = false
    function ifLog(text) {
        if (log == true) {
            console.log(text)
        }
    }

    ifLog('POCZ SKRYPTU - przed setTimeout()')
    let groups = {
        //prefixy działają tak, ze [0]-prefix dla wszystkich włączonych, [1]-tylko dla pierwszego włączonego, [2]-tylko drugiego włączony itd.
        gr: {
            //gr1 gr2 -- to są grupy angielskiego na planie
            current_group_nr: 0,
            max_group_nr: 2,
            prefix: ['gr', 'gr', 'gr']
        },
        jez: {
            //jez1 jez2  -- to są grupy do niemieckiego albo rosyjskiego
            current_group_nr: 0,
            max_group_nr: 2,
            prefix: ['jez', 'jez', 'jez',]
        },
        war: {
            //war1, war2, war3, war4  -- to są grupy dla elektroników i ich lekcji
            current_group_nr: 0,
            max_group_nr: 4,
            prefix: ['war', 'war', 'war', 'war', 'war']
        },
        dz: {
            // to jest chyba doradctwo zawodowe (albo skrót od dziewczyny idk.) i ta lekcja jest w planie zawsze jako "połówka" i nie ma przeciwnej grupy dla tego przedmiotu więc jedyne co robię to poszerzam do całej kolumny albo zwężam (tak jak jest defaultowo)
            current_group_nr: 0,
            max_group_nr: 1,
            prefix: ['Dz', 'Dz']
        },
        prac: {
            //prac1 prac2 prac3  -- to są grupy do zajęć praktycznych takich jak UTK
            current_group_nr: 0,
            max_group_nr: 3,
            prefix: ['prac', 'prac', 'prac', 'prac']
        },
        chl: {
            //Chł.1, Chł.2, Dz.3 -- to jest chyba wf w klasach z dziewczynami
            current_group_nr: 0,
            max_group_nr: 3,
            prefix: ['Chł', 'Chł.', 'Chł.', 'Dz.']
        }
    }

    //war1, war2, war3, war4
    //Dz
    //prac1, prac2, prac3
    //Chł.1, Chł.2, Dz.3


    function cycleThroughGroup(group) {
        if (groups[group].current_group_nr < groups[group].max_group_nr) {
            groups[group].current_group_nr++
        } else {
            groups[group].current_group_nr = 0
        }
    }

    function selectGroup(state, group) {
        let current_nr = groups[group].current_group_nr
        let max_nr = groups[group].max_group_nr
        let prefix = groups[group].prefix
        if (state == 'enabled') {
            if (current_nr == 0) {
                let enabled_list = []
                for (let i = 1; i <= max_nr; i++) {
                    if (max_nr == 1) {
                        enabled_list.push(`${prefix[i]}`)
                    } else {
                        enabled_list.push(`${prefix[i]}${i}`)
                    }
                }
                return enabled_list
            } else {
                if (max_nr == 1) {
                    return `${prefix[current_nr]}`
                } else {
                    return `${prefix[current_nr]}${current_nr}`
                }
            }
        } else if (state == 'disabled') {
            if (current_nr == 0) {
                return undefined
            } else {
                let disabled_list = []
                for (let i = 1; i <= max_nr; i++) {
                    if (i != current_nr) {
                        disabled_list.push(`${prefix[i]}${i}`)
                    }
                }
                return disabled_list
            }
        }
    }

    let ms = 0
    let waiter = setInterval(function () {
        ifLog(JSON.parse(JSON.stringify(document.getElementsByClassName('empty'))))
        if (document.getElementsByClassName('empty')[0] != undefined || ms == 2000) {
            clearInterval(waiter)
            init()
        }
        ms++
    }, 1)


    // Tampermonkey nie potrafi wykryć kiedy załaduję się całkiem angularowa stronka, a skrypt muszę wykonać po pełnym załadowaniu, więc odpalam funkcję setInterval waiter, 
    // która sprawdza czy załadował się już plan lekcji, sprawdzając, czy są jakieś elementy z klasą css 'empty'
    // Jeśli setInterval coś znajdzie, to od razu odpala funkcję init(), która dodaje przyciski. Jeśli w ciągu 2sek nie znajdzie żadnego elementu z klasą css 'empty', to i tak odpali
    // funkcje init(), bo teoretycznie może być taki przypadek, że w planie nie ma żadnej pustej lekcji, ale i tak powinniśmy mieć dostęp do przycisków z wyborem grup. 
    // W takim wypadku 2sek powinny nawet z zapasem wystarczyć, żeby angular się cały załadował, żeby można było pomyślnie dodać do znacznika <header> przyciski.
    // Problemem jest też to, że angular nie przeładowuje normalnie stron, tylko podmienia w locie dokument html odpowiednimi komponentami
    // i przez to tampermonkey nie potrafi wykryć, że zmienił się url. Z tego powodu gdy wejdziemy na stronę główną i z niej przeklikamy się,
    // na jakiś konkretny plan klasy, to nie pokażą się przyciski, bo tampermonke myśli, że cały czas jesteśmy na stronie głównej, bo nie wykryło od czasu wejścia na stronę główną
    // żadnego przeładowania strony. Żeby widzieć przyciski, to trzeba być na stronie z planem lekcji klasy i przeładować stronkę F5 (lub ctrl+F5 to wtedy wymusi ponowne wczytanie strony,
    // i nie załaduje stronki z cache)

    function init() {
        let header = document.getElementsByTagName('header')[0]
        ifLog(header)
        let toolbox = document.createElement('div')
        toolbox.id = 'toolbox'
        toolbox.style.display = 'flex'
        toolbox.style['justify-content'] = 'space-between'

        for (let group in groups) {
            ifLog(group)
            let button = document.createElement('button')
            button.id = `${group}_bt`
            button.style['margin-top'] = '5px'
            button.style['margin-bottom'] = '5px'
            button.style.width = '15%'
            button.style.height = '25px'
            button.style['font-weight'] = 'bold'
            button.innerText = groups[group].prefix[0]
            button.addEventListener('click', function () {
                cycleThroughGroup(group)
                let searchText_enabled = selectGroup('enabled', group)
                ifLog('searchText_enabled')
                ifLog(searchText_enabled)
                let searchText_disabled = selectGroup('disabled', group)
                ifLog('searchText_disabled')
                ifLog(searchText_disabled)
                if (searchText_disabled == undefined) {
                    button.innerText = groups[group].prefix[0]
                } else {
                    button.innerText = searchText_enabled
                }
                let span_list = document.getElementsByTagName('span')
                for (let span of span_list) {
                    ifLog(`typ zmiennej z nazwa-mi/ą grup-/y do pokazania ${(typeof searchText_enabled)}`)
                    if (searchText_disabled == undefined) { // gdy wszystkie grupy mają być pokazane (defaultowe zachowanie)
                        for (let text of searchText_enabled) {
                            if (span.innerText == text) {
                                ifLog('000000000000000000000000000000000000')
                                ifLog('znaleziony div zresetowania')
                                ifLog(span)
                                span.parentElement.parentElement.removeAttribute("style")
                            }
                        }
                    } else { // gdy tylko jedna grupa jest pokazana, a reszta ma być ukryta
                        for (let text of searchText_disabled) {
                            if (span.innerText == text) {
                                ifLog('--------------------------')
                                ifLog('znaleziony div do ukrycia')
                                ifLog(span)
                                span.parentElement.parentElement.removeAttribute("style")
                                span.parentElement.parentElement.style.display = "none"
                            }
                        }
                        if (span.innerText == searchText_enabled) { //gdy znaleziony span ma być pokazany na całą szerokość
                            ifLog('++++++++++++++++++++++++++++')
                            ifLog('znaleziony div do pokazania')
                            ifLog(span)
                            span.parentElement.parentElement.removeAttribute("style") // sapan to jest grand-child diva, którego mamy poszerzyć, flatego daje 2 razy .parentElement, żeby dostać się do grandparent'a - czyli diva do poszerzenia
                            span.parentElement.parentElement.style.width = "100%"
                            span.parentElement.parentElement.style['max-width'] = '100%'
                            span.parentElement.parentElement.style['border-left'] = '0'
                            span.parentElement.parentElement.style['border-right'] = '0'
                        }
                    }
                }
                ifLog(groups[group].current_group_nr)
            })
            toolbox.append(button)
        }
        header.append(document.createElement('br'))
        header.append(toolbox)
    }


})()