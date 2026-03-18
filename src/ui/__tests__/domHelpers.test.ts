// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { el, show, hide, val, clear } from '../domHelpers';

beforeEach(() => {
    document.body.innerHTML = '';
});

describe('el', () => {
    it('returns the element by id', () => {
        document.body.innerHTML = '<div id="test-div">Hello</div>';
        expect(el('test-div').textContent).toBe('Hello');
    });
});

describe('show / hide', () => {
    it('show sets display to block', () => {
        document.body.innerHTML = '<div id="box" style="display:none;"></div>';
        show('box');
        expect(el('box').style.display).toBe('block');
    });

    it('hide sets display to none', () => {
        document.body.innerHTML = '<div id="box" style="display:block;"></div>';
        hide('box');
        expect(el('box').style.display).toBe('none');
    });
});

describe('val', () => {
    it('returns value of an input element', () => {
        document.body.innerHTML = '<input id="name" value="Alice">';
        expect(val('name')).toBe('Alice');
    });

    it('returns value of a select element', () => {
        document.body.innerHTML = '<select id="color"><option value="red" selected>Red</option></select>';
        expect(val('color')).toBe('red');
    });

    it('returns empty string for an input with no value', () => {
        document.body.innerHTML = '<input id="empty" value="">';
        expect(val('empty')).toBe('');
    });

    it('returns checked radio button value when no element with that id exists', () => {
        document.body.innerHTML = `
            <input type="radio" name="choice" value="a">
            <input type="radio" name="choice" value="b" checked>
        `;
        expect(val('choice')).toBe('b');
    });

    it('returns empty string when no element and no checked radio', () => {
        document.body.innerHTML = `
            <input type="radio" name="choice" value="a">
            <input type="radio" name="choice" value="b">
        `;
        expect(val('choice')).toBe('');
    });

    it('returns empty string when no matching element at all', () => {
        expect(val('nonexistent')).toBe('');
    });
});

describe('clear', () => {
    it('clears an input element value', () => {
        document.body.innerHTML = '<input id="field" value="data">';
        clear('field');
        expect((document.getElementById('field') as HTMLInputElement).value).toBe('');
    });

    it('clears a select element value', () => {
        document.body.innerHTML = '<select id="sel"><option value="">--</option><option value="x" selected>X</option></select>';
        clear('sel');
        expect((document.getElementById('sel') as HTMLSelectElement).value).toBe('');
    });

    it('unchecks all radio buttons with the given name when no element has that id', () => {
        document.body.innerHTML = `
            <input type="radio" name="opt" value="1" checked>
            <input type="radio" name="opt" value="2">
        `;
        clear('opt');
        const radios = document.querySelectorAll<HTMLInputElement>('input[name="opt"]');
        radios.forEach(r => expect(r.checked).toBe(false));
    });

    it('does nothing when no element or radio matches', () => {
        expect(() => clear('nonexistent')).not.toThrow();
    });
});
