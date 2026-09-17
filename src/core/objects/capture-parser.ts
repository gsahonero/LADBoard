/**
 * Deterministic NLP & Heuristic Capture Parser for LAD Board
 * Extracts domains, dates, priorities, assigned persons, tags, and action items.
 */

import { InferredStructure } from './types';
import { LADObjectPriority } from '../standard/types';

export class CaptureParser {
  /**
   * Parses free text and produces an InferredStructure for user review and confirmation.
   */
  static parse(text: string, referenceDate: Date = new Date()): InferredStructure {
    const raw = text.trim();
    if (!raw) {
      return {
        rawText: '',
        title: '',
        domain: 'general',
        priority: 'medium',
        tags: [],
        extractedActions: [],
        extractedEntities: [],
        suggestedAttributes: {},
      };
    }

    const domain = this.detectDomain(raw);
    const priority = this.detectPriority(raw);
    const dueDate = this.detectDueDate(raw, referenceDate);
    const assignedTo = this.detectAssignedPerson(raw);
    const tags = this.detectTags(raw, domain);
    const extractedActions = this.extractActionItems(raw);
    const extractedEntities = this.extractEntities(raw);

    // Formulate a concise, clear title
    const title = this.generateTitle(raw, extractedActions);

    return {
      rawText: raw,
      title,
      domain,
      priority,
      dueDate,
      assignedTo,
      tags,
      extractedActions,
      extractedEntities,
      suggestedAttributes: {
        inferred_at: referenceDate.toISOString(),
        has_followup: Boolean(dueDate || extractedActions.length > 0),
      },
    };
  }

  private static detectDomain(text: string): string {
    const lower = text.toLowerCase();

    // Health / Medical keywords
    if (
      /(doctor|medication|medicine|blood test|prescription|hospital|clinic|appointment|dentist|médico|medicina|medicación|análisis|receta|pastilla|dentista|cita médica)/i.test(
        lower
      )
    ) {
      return 'health';
    }

    // Finance / Banking keywords
    if (
      /(bank|balance|invoice|bill|payment|salary|account|transfer|dollar|euro|tax|crypto|banco|saldo|factura|pago|salario|cuenta|transferencia|dinero|impuesto)/i.test(
        lower
      )
    ) {
      return 'finances';
    }

    // Shopping / Groceries
    if (
      /(buy|shopping|grocery|supermarket|purchase|store|cart|comprar|supermercado|tienda|compras|despensa)/i.test(
        lower
      )
    ) {
      return 'shopping';
    }

    // Documents / Legal / Contracts
    if (
      /(contract|passport|id card|document|pdf|certificate|license|contrato|pasaporte|documento|dni|carnet|certificado|licencia)/i.test(
        lower
      )
    ) {
      return 'documents';
    }

    // Home / Maintenance
    if (
      /(repair|plumber|electrician|cleaning|furniture|roof|garden|hogar|casa|reparación|fontanero|electricista|limpieza|mueble)/i.test(
        lower
      )
    ) {
      return 'home';
    }

    // Projects / Work
    if (
      /(deadline|milestone|deploy|github|release|feature|sprint|proyecto|reunión|entrega|desarrollo)/i.test(
        lower
      )
    ) {
      return 'projects';
    }

    return 'general';
  }

  private static detectPriority(text: string): LADObjectPriority {
    const lower = text.toLowerCase();
    if (/(urgent|asap|emergency|urgente|emergencia|inmediatamente|critico|critical)/i.test(lower)) {
      return 'urgent';
    }
    if (/(important|priority|high|importante|alta prioridad|prioridad)/i.test(lower)) {
      return 'high';
    }
    if (/(low priority|maybe|someday|baja prioridad|algún día|cuando pueda)/i.test(lower)) {
      return 'low';
    }
    return 'medium';
  }

  private static detectDueDate(text: string, refDate: Date): string | undefined {
    const lower = text.toLowerCase();

    // "in X weeks" / "en X semanas"
    const weeksMatch = lower.match(/(?:in|en)\s+(\d+|two|three|four|dos|tres|cuatro)\s+weeks?/i) ||
      lower.match(/(?:en)\s+(\d+|dos|tres|cuatro)\s+semanas?/i);
    if (weeksMatch) {
      let numWeeks = 1;
      const val = weeksMatch[1].toLowerCase();
      if (val === 'two' || val === 'dos') numWeeks = 2;
      else if (val === 'three' || val === 'tres') numWeeks = 3;
      else if (val === 'four' || val === 'cuatro') numWeeks = 4;
      else numWeeks = parseInt(val, 10) || 1;

      const target = new Date(refDate);
      target.setDate(target.getDate() + numWeeks * 7);
      return target.toISOString().split('T')[0];
    }

    // "in X days" / "en X días"
    const daysMatch = lower.match(/(?:in|en)\s+(\d+|one|two|three|uno|dos|tres)\s+days?/i) ||
      lower.match(/(?:en)\s+(\d+|uno|dos|tres)\s+d[ií]as?/i);
    if (daysMatch) {
      let numDays = 1;
      const val = daysMatch[1].toLowerCase();
      if (val === 'one' || val === 'uno') numDays = 1;
      else if (val === 'two' || val === 'dos') numDays = 2;
      else if (val === 'three' || val === 'tres') numDays = 3;
      else numDays = parseInt(val, 10) || 1;

      const target = new Date(refDate);
      target.setDate(target.getDate() + numDays);
      return target.toISOString().split('T')[0];
    }

    // "tomorrow" / "mañana"
    if (/(tomorrow|mañana)/i.test(lower)) {
      const target = new Date(refDate);
      target.setDate(target.getDate() + 1);
      return target.toISOString().split('T')[0];
    }

    // "today" / "hoy"
    if (/(today|hoy)/i.test(lower)) {
      return refDate.toISOString().split('T')[0];
    }

    // Date formats (YYYY-MM-DD or DD/MM/YYYY)
    const isoDateMatch = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    if (isoDateMatch) {
      return isoDateMatch[1];
    }

    return undefined;
  }

  private static detectAssignedPerson(text: string): string | undefined {
    const lower = text.toLowerCase();

    // Family roles or names
    const roleMatches = [
      { pattern: /(?:dad|papá|padre)/i, label: 'Dad' },
      { pattern: /(?:mom|mamá|madre)/i, label: 'Mom' },
      { pattern: /(?:sister|hermana)/i, label: 'Sister' },
      { pattern: /(?:brother|hermano)/i, label: 'Brother' },
      { pattern: /(?:partner|pareja)/i, label: 'Partner' },
    ];

    for (const rm of roleMatches) {
      if (rm.pattern.test(lower)) {
        return rm.label;
      }
    }

    // Named assignments like "needs to schedule", "assigned to John", "para Carlos"
    const assignedMatch = text.match(/(?:assigned to|for|para|needs to|debe)\s+([A-Z][a-z]+)/);
    if (assignedMatch) {
      return assignedMatch[1];
    }

    return undefined;
  }

  private static detectTags(text: string, domain: string): string[] {
    const tags = new Set<string>();
    tags.add(domain);

    // Hashtags
    const hashMatches = text.match(/#(\w+)/g);
    if (hashMatches) {
      for (const h of hashMatches) {
        tags.add(h.substring(1).toLowerCase());
      }
    }

    const lower = text.toLowerCase();
    if (lower.includes('medication') || lower.includes('medicación')) tags.add('medication');
    if (lower.includes('blood test') || lower.includes('análisis')) tags.add('lab-test');
    if (lower.includes('follow-up') || lower.includes('seguimiento')) tags.add('follow-up');
    if (lower.includes('bill') || lower.includes('factura')) tags.add('bill');

    return Array.from(tags);
  }

  private static extractActionItems(text: string): string[] {
    const actions: string[] = [];
    // Split by comma, semicolon or period
    const clauses = text.split(/[,.;]/).map((c) => c.trim()).filter((c) => c.length > 0);

    for (const clause of clauses) {
      if (
        /(needs to|schedule|call|pay|send|buy|book|test|programar|llamar|pagar|enviar|comprar|reservar|análisis|continuar)/i.test(
          clause
        )
      ) {
        actions.push(clause);
      }
    }

    return actions.length > 0 ? actions : [text];
  }

  private static extractEntities(text: string): Array<{ name: string; type: string }> {
    const entities: Array<{ name: string; type: string }> = [];

    if (/(doctor|médico)/i.test(text)) {
      entities.push({ name: 'Doctor', type: 'person' });
    }
    if (/(dad|papá)/i.test(text)) {
      entities.push({ name: 'Dad', type: 'person' });
    }
    if (/(blood test|análisis)/i.test(text)) {
      entities.push({ name: 'Blood Test', type: 'procedure' });
    }
    if (/(medication|medicación)/i.test(text)) {
      entities.push({ name: 'Medication', type: 'treatment' });
    }

    return entities;
  }

  private static generateTitle(text: string, actions: string[]): string {
    // If the text is short enough, use it
    if (text.length <= 60) return text;

    // If we have distinct action items, summarize the first action
    if (actions.length > 0 && actions[0].length <= 60) {
      return actions[0];
    }

    // Otherwise truncate gracefully at word boundary
    const truncated = text.substring(0, 57);
    const lastSpace = truncated.lastIndexOf(' ');
    return `${truncated.substring(0, lastSpace > 0 ? lastSpace : 57)}...`;
  }
}
