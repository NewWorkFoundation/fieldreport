import { DocumentMeta } from '../components/DocumentMeta'
import { TypistSankey } from '../components/TypistSankey'

export function DeadFieldGraphic() {
  return (
    <div className="dead-field-poster">
      <DocumentMeta
        title="Don't study to be a typist"
        description="Illustration. A dead clerical field reallocates into Data Admin, word processing, and office roles."
      />
      <TypistSankey className="dead-field-poster__art" />
    </div>
  )
}
